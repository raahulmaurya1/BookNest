import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { booksAPI, lendingAPI } from '../api/books';
import BookCard from '../components/BookCard';
import BookForm from '../components/BookForm';
import Loading from '../components/Loading';
import { BookOpen } from 'lucide-react';

const Books = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  
  const statusFilter = searchParams.get('status');
  const yearFilter = searchParams.get('year');

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const [booksResponse, lentResponse] = await Promise.all([
        booksAPI.getAll(),
        lendingAPI.getLent()
      ]);
      const booksData = booksResponse.data || [];
      const lentData = lentResponse.data || [];

      // Merge active lending info locally
      const mappedBooks = booksData.map(book => {
        const activeLending = lentData.find(l => l.book_id === book.id && !l.returned_date);
        return {
          ...book,
          is_lent: !!activeLending,
          lending_id: activeLending ? activeLending.id : null
        };
      });

      setBooks(mappedBooks);
      setError(null);
    } catch (err) {
      setError('Failed to load books');
      console.error('Books fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data, pdfFile) => {
    try { 
      const res = await booksAPI.create(data);
      const createdBook = res.data;
      if (pdfFile && createdBook?.id) {
        const formData = new FormData();
        formData.append('file', pdfFile);
        await booksAPI.uploadPDF(createdBook.id, formData);
      }
      setShowForm(false); 
      fetchBooks(); 
    } 
    catch (err) { 
      throw err; 
    }
  };

  const handleUpdate = async (id, data, pdfFile) => {
    try { 
      await booksAPI.update(id, data); 
      if (pdfFile) {
        const formData = new FormData();
        formData.append('file', pdfFile);
        await booksAPI.uploadPDF(id, formData);
      }
      setEditingBook(null); 
      setShowForm(false); 
      fetchBooks(); 
    } 
    catch (err) { 
      throw err; 
    }
  };

  const handleDelete = (id) => {
    // Optimistically update state since the deletion request already completed in BookCard
    setBooks(prev => prev.filter(book => book.id !== id));
  };

  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      let match = true;
      if (statusFilter) {
        const filterLower = statusFilter.toLowerCase();
        if (filterLower === 'reading' && book.status !== 'Reading') match = false;
        if (filterLower === 'finished' && book.status !== 'Finished') match = false;
        if (filterLower === 'want_to_read' && book.status !== 'Want to Read') match = false;
      }
      if (yearFilter) {
        if (book.finished_date) {
          const finishYear = new Date(book.finished_date).getFullYear().toString();
          if (finishYear !== yearFilter) match = false;
        } else {
          match = false;
        }
      }
      return match;
    });
  }, [books, statusFilter, yearFilter]);

  if (loading && books.length === 0) {
    return <Loading message="Loading your library..." fullPage={true} />;
  }

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-white border border-hairline p-6 rounded-lg shadow-sm">
        <div className="flex items-center">
          <div>
            <h1 className="text-2xl font-serif font-bold text-ink tracking-tight">My Personal Library</h1>
            <p className="text-xs font-semibold text-ink-muted mt-1">Catalog, track progress, read, and lend your books</p>
          </div>
          {(statusFilter || yearFilter) && (
            <div className="ml-6 flex items-center bg-paper px-3 py-1.5 rounded-lg border border-hairline">
              <span className="text-xs font-semibold text-ink mr-3">
                Filtered by: {statusFilter && `Status: ${statusFilter}`} {yearFilter && `Year: ${yearFilter}`}
              </span>
              <button 
                onClick={() => setSearchParams({})} 
                className="text-[10px] font-bold uppercase tracking-wider text-ink-muted hover:text-ink transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
        <button 
          onClick={() => { setEditingBook(null); setShowForm(true); }} 
          className="btn-primary"
        >
          Add Book
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-800 px-4 py-3 rounded-lg text-xs font-medium">
          {error}
        </div>
      )}

      {/* Book Grid */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-hairline rounded-lg p-8 max-w-md mx-auto">
          <BookOpen className="w-10 h-10 text-ink-muted mx-auto" strokeWidth={1.5} />
          <h3 className="mt-4 text-base font-serif font-bold text-ink">No books found</h3>
          <p className="text-xs text-ink-muted mt-1 max-w-xs mx-auto">
            {books.length > 0 
              ? "None of your books match the current filters." 
              : "You haven't cataloged any books in your digital library yet. Add your first book to get started!"}
          </p>
          {books.length === 0 ? (
            <button 
              onClick={() => { setEditingBook(null); setShowForm(true); }} 
              className="mt-6 btn-primary"
            >
              Add Your First Book
            </button>
          ) : (
            <button 
              onClick={() => setSearchParams({})} 
              className="mt-6 btn-secondary"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onUpdate={() => { setEditingBook(book); setShowForm(true); }}
              onDelete={handleDelete}
              onProgressUpdate={fetchBooks}
              onLend={fetchBooks}
              onReturn={fetchBooks}
            />
          ))}
        </div>
      )}

      {showForm && (
        <BookForm 
          initialData={editingBook} 
          onSubmit={editingBook ? handleUpdate : handleCreate} 
          onClose={() => { setShowForm(false); setEditingBook(null); }} 
        />
      )}
    </div>
  );
};

export default Books;