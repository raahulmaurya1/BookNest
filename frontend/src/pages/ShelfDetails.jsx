import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shelvesAPI, membersAPI } from '../api/shelves';
import { booksAPI, lendingAPI } from '../api/books';
import { useAuth } from '../hooks/useAuth';
import { useShelfSubscription } from '../websocket/useSocket';
import BookCard from '../components/BookCard';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import ConfirmDialog from '../components/ConfirmDialog';
import { FolderOpen } from 'lucide-react';

const ShelfDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shelf, setShelf] = useState(null);
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [allBooks, setAllBooks] = useState([]);
  const [showAddBook, setShowAddBook] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [confirmConfig, setConfirmConfig] = useState({ open: false });

  const closeConfirm = () => setConfirmConfig({ ...confirmConfig, open: false });

  const showError = (msg) => {
    setConfirmConfig({
      open: true,
      title: 'Error',
      message: msg,
      confirmLabel: 'OK',
      cancelLabel: null,
      destructive: true,
      onConfirm: closeConfirm
    });
  };

  useEffect(() => {
    fetchShelfDetails();
  }, [id]);

  const fetchShelfDetails = async () => {
    try {
      setLoading(true);
      const [shelfResponse, allBooksResponse, lentResponse] = await Promise.all([
        shelvesAPI.getById(id),
        booksAPI.getAll(),
        lendingAPI.getLent()
      ]);
      const shelfData = shelfResponse.data;
      const lentData = lentResponse.data || [];

      // Merge active lending info
      const mappedShelfBooks = (shelfData.books || []).map(book => {
        const activeLending = lentData.find(l => l.book_id === book.id && !l.returned_date);
        return {
          ...book,
          is_lent: !!activeLending,
          lending_id: activeLending ? activeLending.id : null
        };
      });

      setShelf(shelfData);
      setBooks(mappedShelfBooks);

      const booksData = allBooksResponse.data || [];
      setAllBooks(Array.isArray(booksData) ? booksData : booksData.books || []);
      
      let fetchedMembers = [];
      try {
        const membersRes = await membersAPI.getMembers(id);
        fetchedMembers = membersRes.data || [];
        setMembers(fetchedMembers);
      } catch (mErr) {
        console.error('Failed to load shelf members:', mErr);
        setMembers([]);
      }

      // Determine the user role dynamically
      if (shelfData.owner_id === user?.id) {
        setUserRole('owner');
      } else {
        const currentMember = fetchedMembers.find(m => m.user_id === user?.id);
        if (currentMember) {
          setUserRole(currentMember.role.toLowerCase());
        } else {
          setUserRole('viewer');
        }
      }

      // Save shared shelf details to localStorage for quick navigation
      if (shelfData.owner_id !== user?.id) {
        try {
          const recent = JSON.parse(localStorage.getItem('recent_shared_shelves') || '[]');
          const filtered = recent.filter(item => item.id !== shelfData.id && item.id !== parseInt(shelfData.id));
          const updated = [{ id: shelfData.id, name: shelfData.name }, ...filtered].slice(0, 5);
          localStorage.setItem('recent_shared_shelves', JSON.stringify(updated));
        } catch (storageErr) {
          console.error('Failed to save recent shelf:', storageErr);
        }
      }

      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load shelf details');
      console.error('Shelf details error:', err);
    } finally {
      setLoading(false);
    }
  };

  useShelfSubscription(id, () => {
    fetchShelfDetails();
  });

  const handleAddBook = async () => {
    if (!selectedBookId) return;
    try {
      await shelvesAPI.addBook(id, selectedBookId);
      setShowAddBook(false);
      setSelectedBookId('');
      fetchShelfDetails();
    } catch (err) {
      console.error('Add book error:', err);
      showError(err.response?.data?.detail || 'Failed to add book to shelf');
    }
  };

  const handleRemoveBookClick = (bookId) => {
    setConfirmConfig({
      open: true,
      title: 'Remove book?',
      message: 'Remove this book from the shelf?',
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel',
      destructive: true,
      onConfirm: async () => {
        closeConfirm();
        try {
          await shelvesAPI.removeBook(id, bookId);
          fetchShelfDetails();
        } catch (err) {
          console.error('Remove book error:', err);
          showError(err.response?.data?.detail || 'Failed to remove book');
        }
      }
    });
  };

  const handleAddMember = async (userIdStr, role) => {
    try {
      const userId = parseInt(userIdStr);
      if (isNaN(userId)) {
        showError('Please enter a valid numeric User ID');
        return;
      }
      await membersAPI.addMember(id, { user_id: userId, role });
      fetchShelfDetails();
    } catch (err) {
      console.error('Add member error:', err);
      showError(err.response?.data?.detail || 'Failed to add collaborator');
    }
  };

  const handleUpdateMember = async (userId, role) => {
    try {
      await membersAPI.updateMember(id, userId, role);
      fetchShelfDetails();
    } catch (err) {
      console.error('Update member error:', err);
      showError(err.response?.data?.detail || 'Failed to update role');
    }
  };

  const handleRemoveMemberClick = (userId) => {
    setConfirmConfig({
      open: true,
      title: 'Remove collaborator?',
      message: 'This user will lose access to this shelf.',
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel',
      destructive: true,
      onConfirm: async () => {
        closeConfirm();
        try {
          await membersAPI.removeMember(id, userId);
          fetchShelfDetails();
        } catch (err) {
          console.error('Remove member error:', err);
          showError(err.response?.data?.detail || 'Failed to remove collaborator');
        }
      }
    });
  };

  const handleDeleteShelfClick = () => {
    setConfirmConfig({
      open: true,
      title: 'Delete this shelf?',
      message: 'Books on this shelf will not be deleted, only the shelf itself.',
      confirmLabel: 'Delete Shelf',
      cancelLabel: 'Cancel',
      destructive: true,
      onConfirm: async () => {
        closeConfirm();
        try {
          await shelvesAPI.delete(id);
          navigate('/shelves');
        } catch (err) {
          console.error('Delete shelf error:', err);
          showError(err.response?.data?.detail || 'Failed to delete shelf');
        }
      }
    });
  };

  const getInitials = (name, email) => {
    const text = name || email || 'C';
    return text.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  if (loading) {
    return <Loading message="Loading shelf catalog..." fullPage={true} />;
  }

  if (error || !shelf) {
    return (
      <div className="max-w-lg mx-auto mt-10">
        <ErrorMessage error={error || 'Shelf not found'} onRetry={fetchShelfDetails} />
      </div>
    );
  }

  const isOwner = userRole === 'owner';
  const canEdit = isOwner || userRole === 'editor';

  return (
    <div className="space-y-8 py-4">
      {/* Header Widget */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white border border-hairline p-6 rounded-lg shadow-sm">
        <div className="flex items-center space-x-4">
          <FolderOpen className="w-8 h-8 text-accent" strokeWidth={1.5} />
          <div>
            <h1 className="text-2xl font-serif font-bold text-ink tracking-tight">{shelf.name}</h1>
            <div className="mt-1 flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-semibold text-ink-muted">
              <span>{isOwner ? 'Created by You' : `Shared with you as ${userRole}`}</span>
              <span>•</span>
              <span>{books.length} {books.length === 1 ? 'book' : 'books'} cataloged</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-hairline bg-paper text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Shelf ID: {shelf.id}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isOwner && (
            <button 
              onClick={handleDeleteShelfClick} 
              className="px-4 py-2.5 text-xs font-bold text-red-600 hover:text-red-800 transition-colors"
            >
              Delete Shelf
            </button>
          )}
          {canEdit && (
            <button 
              onClick={() => setShowAddBook(true)} 
              className="btn-primary"
            >
              Add Book to Shelf
            </button>
          )}
        </div>
      </div>

      {/* Grid of Books */}
      {books.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-hairline rounded-lg p-6">
          <p className="text-sm font-semibold text-ink-muted italic">No books stored on this shelf yet.</p>
          {canEdit && (
            <button 
              onClick={() => setShowAddBook(true)} 
              className="mt-4 btn-primary px-5 py-2.5"
            >
              Add First Book
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <BookCard 
              key={book.id} 
              book={book} 
              showActions={canEdit} 
              onRemoveFromShelf={() => handleRemoveBookClick(book.id)} 
              onProgressUpdate={fetchShelfDetails}
              onLend={fetchShelfDetails}
              onReturn={fetchShelfDetails}
            />
          ))}
        </div>
      )}

      {/* Collaborators section (Owner view) */}
      {isOwner && (
        <div className="border border-hairline bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-base font-serif font-bold text-ink tracking-tight mb-5">Collaborator Access Controls</h2>
          
          <div className="divide-y divide-hairline space-y-4">
            {members.map((member) => (
              <div key={member.user_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 first:pt-0">
                <div className="flex items-center space-x-3.5">
                  <div className="w-9 h-9 rounded-lg bg-paper text-ink-muted flex items-center justify-center font-bold text-xs border border-hairline">
                    {getInitials(member.name, member.email)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink">{member.name || `User ID: ${member.user_id}`}</p>
                    <p className="text-[11px] text-ink-muted font-semibold">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end sm:self-auto">
                  {member.role === 'Owner' || member.role === 'owner' ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-paper text-ink-muted px-2.5 py-1 rounded-lg border border-hairline">
                      Owner
                    </span>
                  ) : (
                    <>
                      <select 
                        value={member.role} 
                        onChange={(e) => handleUpdateMember(member.user_id, e.target.value)} 
                        className="input-field w-32 py-1.5 px-3 text-xs bg-white border-hairline"
                      >
                        <option value="Viewer">Viewer</option>
                        <option value="Editor">Editor</option>
                      </select>
                      <button 
                        onClick={() => handleRemoveMemberClick(member.user_id)} 
                        className="text-xs font-bold text-red-600 hover:text-red-800 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Add member form */}
            <div className="mt-6 pt-5 border-t border-hairline">
              <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3">Add Collaborator by User ID</h3>
              <form 
                onSubmit={(e) => { 
                  e.preventDefault(); 
                  const userId = e.target.userId.value; 
                  const role = e.target.role.value; 
                  if (userId) { 
                    handleAddMember(userId, role); 
                    e.target.reset(); 
                  } 
                }} 
                className="flex flex-col sm:flex-row gap-3"
              >
                <input 
                  name="userId" 
                  type="number" 
                  placeholder="Enter User ID (e.g. 2)" 
                  className="input-field flex-1 py-2.5" 
                  required 
                />
                <select name="role" className="input-field w-36 py-2.5">
                  <option value="Viewer">Viewer</option>
                  <option value="Editor">Editor</option>
                </select>
                <button type="submit" className="btn-primary py-2.5 px-6">
                  Add Collaborator
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Book to Shelf overlay modal */}
      {showAddBook && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-hairline rounded-lg shadow-md p-7 max-w-md w-full">
            <h2 className="text-lg font-serif font-bold text-ink tracking-tight mb-2">Add Book to Shelf</h2>
            <p className="text-xs text-ink-muted mb-5">Select a cataloged book to place it onto this shelf.</p>
            
            <select 
              value={selectedBookId} 
              onChange={(e) => setSelectedBookId(e.target.value)} 
              className="input-field w-full mb-6"
            >
              <option value="">Select a book...</option>
              {allBooks.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title} by {book.author}
                </option>
              ))}
            </select>

            <div className="flex justify-end space-x-3 border-t border-hairline pt-4">
              <button 
                onClick={() => { setShowAddBook(false); setSelectedBookId(''); }} 
                className="btn-secondary flex-1 py-2.5"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddBook} 
                disabled={!selectedBookId} 
                className="btn-primary flex-1 py-2.5"
              >
                Add Book
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog 
        open={confirmConfig.open}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel}
        cancelLabel={confirmConfig.cancelLabel}
        destructive={confirmConfig.destructive}
        onConfirm={confirmConfig.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
};

export default ShelfDetails;