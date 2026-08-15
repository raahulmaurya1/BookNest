import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { booksAPI, lendingAPI } from '../api/books';
import { useAuth } from '../hooks/useAuth';
import ErrorMessage from './ErrorMessage';
import ConfirmDialog from './ConfirmDialog';
import { Star, ArrowUpRight, ArrowDownLeft, User, BookOpen, MoreVertical } from 'lucide-react';

const BookCard = ({ book, onUpdate, onDelete, onRemoveFromShelf, onProgressUpdate, onLend, onReturn, showActions = true, viewerRole }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showLendForm, setShowLendForm] = useState(false);
  const [borrowerEmail, setBorrowerEmail] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const isOwner = viewerRole === 'owner' || ((!viewerRole) && ((book.owner_id === user?.id) || (!book.owner_id && book.user_id === user?.id)));
  const isBorrower = viewerRole === 'borrower' || ((!viewerRole) && (book.borrower_id === user?.id));

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmReturn, setShowConfirmReturn] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await booksAPI.delete(book.id);
      onDelete?.(book.id);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to delete book');
    } finally {
      setIsLoading(false);
      setShowConfirmDelete(false);
    }
  };

  const handleLendSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await lendingAPI.lend(book.id, borrowerEmail.trim().toLowerCase());
      // Close the form FIRST before invoking onLend — otherwise the parent
      // re-render (fetchBooks) fires while showLendForm is still true,
      // causing the overlay to briefly appear on all re-rendered cards.
      setShowLendForm(false);
      setBorrowerEmail('');
      onLend?.(book.id);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to lend book');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnBook = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await lendingAPI.returnBook(book.id);
      setShowConfirmReturn(false);
      onReturn?.(book.id);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to return book');
    } finally {
      setIsLoading(false);
    }
  };

  // Manual progress update removed: progress is now strictly synced via PDFReader

  const getStatusConfig = (status) => {
    const configs = {
      'Want to Read': 'bg-paper text-ink-muted border-hairline',
      'Reading': 'bg-accent/10 text-accent border-accent/20',
      'Finished': 'bg-white text-ink-muted border-hairline',
    };
    return configs[status] || 'bg-paper text-ink-muted border-hairline';
  };

  const progress = book.total_pages > 0 ? Math.round(((book.current_page || 0) / book.total_pages) * 100) : 0;
  const statusBadgeClass = getStatusConfig(book.status);

  return (
    <div className="border border-hairline bg-white rounded-lg shadow-sm flex flex-col justify-between h-full min-h-[220px] hover:shadow-md hover:border-accent transition-all relative overflow-hidden">
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header row */}
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-base font-serif font-bold text-ink tracking-tight leading-tight line-clamp-1">{book.title}</h3>
              <p className="text-xs text-ink-muted mt-0.5">by {book.author}</p>
            </div>
            
            {/* Rating or Status Badge */}
            <div className="flex flex-col items-end space-y-1 ml-2">
              <span className={`px-2 py-0.5 text-[9px] font-bold rounded border uppercase tracking-wider ${statusBadgeClass}`}>
                {book.status}
              </span>
              {book.status === 'Finished' && book.rating > 0 && (
                <div className="flex items-center text-accent text-xs font-semibold bg-paper px-2 py-0.5 rounded border border-hairline">
                  <Star className="w-3 h-3 mr-1 text-accent" strokeWidth={2} />
                  {book.rating}/5
                </div>
              )}
            </div>
          </div>

          {/* Badges for Lending Status */}
          {(book.is_lent || onRemoveFromShelf) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {book.is_lent && (
                <span className="px-2 py-0.5 border border-hairline bg-paper text-ink-muted text-[10px] font-semibold rounded flex items-center gap-1">
                  {isBorrower ? (
                    <>
                      <ArrowDownLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Borrowed from {book.owner_name || book.owner_id}
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Lent to {book.borrower_name || book.borrower_id || 'Borrower'}
                    </>
                  )}
                </span>
              )}
              {isOwner && book.is_lent && (
                <span className="text-[10px] text-ink-muted italic">
                  · You can still read your copy
                </span>
              )}
            </div>
          )}

          {/* Progress bar */}
          {book.total_pages > 0 && (
            <div className="mt-4">
              <div className="flex justify-between items-center text-[11px] font-bold text-ink-muted">
                <span>Reading Progress</span>
                <span className="text-ink">{book.current_page || 0}/{book.total_pages} pages ({progress}%)</span>
              </div>
              <div className="w-full bg-paper border border-hairline rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-500 ease-out bg-accent`} 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>
          )}

          {/* Notes summary */}
          {book.notes && (
            <div className="relative mt-3.5 rounded-lg border border-hairline bg-paper overflow-hidden">
              <div className="max-h-16 overflow-y-auto scrollbar-hide p-2.5">
                <p className="text-xs text-ink-muted italic leading-relaxed">
                  "{book.notes}"
                </p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-paper to-transparent pointer-events-none" />
            </div>
          )}
        </div>

        {/* Errors display */}
        {error && <div className="mt-3"><ErrorMessage error={error} onRetry={() => setError(null)} /></div>}

        {/* Footer actions */}
        <div className="mt-5 border-t border-hairline pt-3.5 flex flex-wrap items-center justify-between gap-2.5">
          {/* Read PDF Button */}
          {book.pdf_path ? (
            <button
              onClick={() => navigate(`/books/${book.id}/read`)}
              className="btn-primary text-xs py-1.5 px-3 flex items-center space-x-1"
            >
              <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>{book.current_page > 0 ? 'Resume' : 'Read PDF'}</span>
            </button>
          ) : (
            <div className="text-[10px] text-ink-muted font-semibold italic">No digital copy</div>
          )}

          {/* Other actions list */}
          <div className="flex items-center space-x-2.5 ml-auto">
            {showActions && (
              <div className="flex items-center space-x-1 relative">
                {/* Borrower Actions */}
                {isBorrower && (
                  <button 
                    onClick={() => setShowConfirmReturn(true)} 
                    disabled={isLoading} 
                    className="text-xs font-bold text-accent hover:text-accent-hover hover:bg-paper px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Return
                  </button>
                )}
                
                {/* Owner Actions */}
                {isOwner && (
                  <>
                    {!book.is_lent && book.status !== 'Finished' && (
                      <button 
                        onClick={() => setShowLendForm(true)} 
                        className="text-xs font-bold text-accent hover:text-accent-hover hover:bg-paper px-2 py-1 rounded-lg transition-colors"
                      >
                        Lend
                      </button>
                    )}
                    {book.is_lent && (
                      <button 
                        onClick={() => setShowConfirmReturn(true)} 
                        disabled={isLoading} 
                        className="text-xs font-bold text-accent hover:text-accent-hover hover:bg-paper px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Mark as Returned
                      </button>
                    )}
                    
                    {/* Management Overflow Menu */}
                    <div className="relative">
                      <button 
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-paper transition-colors flex items-center justify-center"
                        title="More actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {showMenu && (
                        <div 
                          className="absolute right-0 bottom-full mb-1 w-36 bg-white border border-hairline rounded-lg shadow-lg py-1 z-20"
                          onMouseLeave={() => setShowMenu(false)}
                        >
                          <button 
                            onClick={() => { setShowMenu(false); onUpdate?.(book); }} 
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-ink hover:bg-paper transition-colors"
                          >
                            Edit Book
                          </button>
                          {onRemoveFromShelf && (
                            <button 
                              onClick={() => { setShowMenu(false); onRemoveFromShelf(); }} 
                              className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                            >
                              Remove from Shelf
                            </button>
                          )}
                          <button 
                            onClick={() => { setShowMenu(false); setShowConfirmDelete(true); }} 
                            disabled={isLoading || book.is_lent}
                            title={book.is_lent ? "This book is currently lent out and cannot be deleted until returned." : undefined}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Delete Book
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lending Form overlay panel */}
      {showLendForm && (
        <div className="absolute inset-0 bg-ink/40 z-10 flex flex-col justify-end">
          <form onSubmit={handleLendSubmit} className="bg-white p-4 rounded-t-xl shadow-md border-t border-hairline">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2">Lend This Book</h4>
            <div className="flex flex-col space-y-2.5">
              <input 
                type="email" 
                value={borrowerEmail} 
                onChange={(e) => setBorrowerEmail(e.target.value)} 
                placeholder="Borrower's email address" 
                className="input-field py-2 text-xs" 
                required 
              />
              <div className="flex space-x-2">
                <button type="submit" disabled={isLoading} className="btn-primary text-xs py-2 flex-1">{isLoading ? 'Lending...' : 'Lend'}</button>
                <button type="button" onClick={() => setShowLendForm(false)} className="btn-secondary text-xs py-2 flex-1">Cancel</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Progress Form Removed */}

        <ConfirmDialog
          open={showConfirmDelete}
          title="Delete Book?"
          message={
            book.is_lent 
              ? "This book is currently lent out and cannot be deleted until returned."
              : "Are you sure you want to permanently delete this book from your library? This action cannot be undone."
          }
          confirmLabel={book.is_lent ? "Okay" : "Delete"}
          destructive={!book.is_lent}
          onConfirm={book.is_lent ? () => setShowConfirmDelete(false) : handleDelete}
          onCancel={() => setShowConfirmDelete(false)}
        />
        <ConfirmDialog
          open={showConfirmReturn}
          title={isOwner ? "Mark as Returned?" : "Return Book?"}
          message={
            isOwner 
              ? `Confirm you've received "${book.title}" back from this borrower?` 
              : `Return "${book.title}"? You'll lose access to keep reading it.`
          }
          confirmLabel={isOwner ? "Mark Returned" : "Return Book"}
          destructive={false}
          onConfirm={handleReturnBook}
          onCancel={() => setShowConfirmReturn(false)}
        />
    </div>
  );
};

export default BookCard;