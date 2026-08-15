import React, { useState, useEffect } from 'react';
import { booksAPI, lendingAPI } from '../api/books';
import { useBorrowedBooksSubscription } from '../websocket/useSocket';
import BookCard from '../components/BookCard';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { ArrowLeftRight } from 'lucide-react';

const missingBooksCache = new Set();

const BorrowedBooks = () => {
  const [activeTab, setActiveTab] = useState('borrowed'); // 'borrowed' or 'lent'
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBorrowedBooks = async () => {
    const lendingResponse = await lendingAPI.getBorrowed();
    const lendings = lendingResponse.data || [];
    
    const booksData = await Promise.all(
      lendings.map(async (lending) => {
        if (missingBooksCache.has(lending.book_id)) {
          return { _isMissing: true, id: `missing-${lending.id}`, original_book_id: lending.book_id };
        }
        try {
          const bookRes = await booksAPI.getById(lending.book_id);
          return {
            ...bookRes.data,
            is_lent: true,
            lending_id: lending.id,
            lent_date: lending.lent_date,
            owner_id: lending.owner_id,
            owner_name: lending.owner_name,
            borrower_id: lending.borrower_id,
            borrower_name: lending.borrower_name
          };
        } catch (e) {
          console.warn(`Book ${lending.book_id} not found.`);
          missingBooksCache.add(lending.book_id);
          return { _isMissing: true, id: `missing-${lending.id}`, original_book_id: lending.book_id };
        }
      })
    );
    
    const validBooks = booksData.filter(Boolean);
    return Array.from(new Map(validBooks.map(b => [b._isMissing ? b.original_book_id : b.id, b])).values());
  };

  const fetchLentBooks = async () => {
    const [lentResponse, booksResponse] = await Promise.all([
      lendingAPI.getLent(),
      booksAPI.getAll()
    ]);
    const lentData = lentResponse.data || [];
    const myBooks = booksResponse.data || [];

    const mappedLentBooks = lentData
      .filter(l => !l.returned_date)
      .map(lending => {
        const book = myBooks.find(b => b.id === lending.book_id);
        if (!book) {
          missingBooksCache.add(lending.book_id);
          return { _isMissing: true, id: `missing-${lending.id}`, original_book_id: lending.book_id };
        }
        return {
          ...book,
          is_lent: true,
          lending_id: lending.id,
          borrower_id: lending.borrower_id,
          borrower_name: lending.borrower_name,
          owner_id: lending.owner_id,
          owner_name: lending.owner_name,
          lent_date: lending.lent_date
        };
      })
      .filter(Boolean);

    return Array.from(new Map(mappedLentBooks.map(b => [b._isMissing ? b.original_book_id : b.id, b])).values());
  };

  const fetchData = React.useCallback(async (isCancelledRef = { current: false }) => {
    setLoading(true);
    try {
      let data = [];
      if (activeTab === 'borrowed') {
        data = await fetchBorrowedBooks();
      } else {
        data = await fetchLentBooks();
      }
      
      if (!isCancelledRef.current) {
        setBooks(data);
        setError(null);
      }
    } catch (err) {
      if (!isCancelledRef.current) {
        setError('Failed to load shared books');
        console.error('Shared books error:', err);
      }
    } finally {
      if (!isCancelledRef.current) {
        setLoading(false);
      }
    }
  }, [activeTab]); // only re-create if activeTab changes

  useEffect(() => {
    const isCancelledRef = { current: false };
    fetchData(isCancelledRef);
    return () => { isCancelledRef.current = true; };
  }, [fetchData]);

  // Use a ref to always call the latest fetchData without triggering re-subscribes
  const latestFetchDataRef = React.useRef(fetchData);
  useEffect(() => {
    latestFetchDataRef.current = fetchData;
  }, [fetchData]);

  useBorrowedBooksSubscription(() => {
    latestFetchDataRef.current();
  });

  if (loading && books.length === 0) {
    return <Loading message="Loading shared books..." fullPage={true} />;
  }

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="pb-6 border-b border-hairline flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif text-ink">Lending & Borrowing</h1>
          <p className="text-xs font-semibold text-ink-muted mt-1">Track books you lent to friends or borrowed from other libraries</p>
        </div>
      </div>

      {error && (
        <div className="max-w-lg mx-auto">
          <ErrorMessage error={error} onRetry={fetchData} />
        </div>
      )}

      {/* Premium Tab Navigation */}
      <div className="flex border-b border-hairline max-w-xs space-x-6">
        <button
          onClick={() => setActiveTab('borrowed')}
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'borrowed'
              ? 'border-accent text-accent'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          Borrowed
        </button>
        <button
          onClick={() => setActiveTab('lent')}
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'lent'
              ? 'border-accent text-accent'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          Lent
        </button>
      </div>

      {/* Grid List */}
      {books.length === 0 ? (
        <div className="border border-hairline bg-white rounded-lg shadow-sm p-8 max-w-md mx-auto text-center">
          <ArrowLeftRight className="w-12 h-12 text-ink-muted mx-auto mb-2" strokeWidth={1.5} />
          <h3 className="text-sm font-bold text-ink">
            {activeTab === 'borrowed' 
              ? "No borrowed books" 
              : "No lent books"}
          </h3>
          <p className="text-xs text-ink-muted mt-1 max-w-xs mx-auto">
            {activeTab === 'borrowed' 
              ? "You haven't borrowed books from other users' libraries yet." 
              : "You haven't lent out any of your books to other collaborators yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => {
            if (book._isMissing) {
              return (
                <div key={book.id} className="border border-hairline bg-paper/50 rounded-lg shadow-sm flex flex-col justify-center items-center h-full min-h-[220px] p-5 text-center">
                  <div className="text-ink-muted mb-2">🚫</div>
                  <h3 className="text-sm font-semibold text-ink-muted">Book Unavailable</h3>
                  <p className="text-[10px] text-ink-muted/80 mt-1">This book (ID: {book.original_book_id}) has been deleted by its owner.</p>
                </div>
              );
            }
            return (
              <BookCard 
                key={book.id} 
                book={book} 
                showActions={true}
                viewerRole={activeTab === 'borrowed' ? 'borrower' : 'owner'} 
                onReturn={fetchData}
                onProgressUpdate={fetchData}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BorrowedBooks;