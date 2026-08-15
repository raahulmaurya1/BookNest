import React from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Book } from 'lucide-react';

const ShelfCard = ({ shelf, isOwner, role, onUpdate, onDelete }) => {
  const getRoleBadge = () => {
    if (isOwner) {
      return (
        <span className="text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent px-2 py-0.5 rounded border border-accent/20">
          Owner
        </span>
      );
    }
    const isEditor = role === 'editor';
    return (
      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
        isEditor 
          ? 'bg-accent/10 text-accent border-accent/20' 
          : 'bg-paper text-ink-muted border-hairline'
      }`}>
        {isEditor ? 'Editor' : 'Viewer'}
      </span>
    );
  };

  const bookList = shelf.books || [];
  const bookCount = bookList.length || shelf.bookCount || 0;

  return (
    <div className="border border-hairline bg-white rounded-lg shadow-sm flex flex-col justify-between h-full p-5 min-h-[200px] hover:shadow-md hover:border-accent transition-all">
      <Link to={`/shelves/${shelf.id}`} className="block flex-1">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-serif font-bold text-ink leading-snug tracking-tight hover:text-accent transition-colors line-clamp-1 flex items-center">
              <FolderOpen className="w-5 h-5 text-accent mr-2" strokeWidth={1.5} />
              <span>{shelf.name}</span>
            </h3>
            <div className="mt-2 flex items-center space-x-2.5">
              <span className="text-xs font-semibold text-ink-muted">
                {bookCount} {bookCount === 1 ? 'book' : 'books'}
              </span>
              <span className="text-hairline">•</span>
              {getRoleBadge()}
            </div>
          </div>
        </div>

        {/* Small preview stack of books */}
        {bookList.length > 0 ? (
          <div className="mt-4 border-t border-hairline pt-3 space-y-2">
            {bookList.slice(0, 3).map((book) => (
              <div key={book.id} className="text-xs flex items-center justify-between text-ink-muted hover:text-ink transition-colors">
                <span className="truncate font-medium max-w-[180px] flex items-center">
                  <Book className="w-3.5 h-3.5 mr-1.5 text-ink-muted" strokeWidth={1.5} />
                  <span>{book.title}</span>
                </span>
                <span className="text-[10px] text-ink-muted font-normal truncate ml-1">{book.author}</span>
              </div>
            ))}
            {bookList.length > 3 && (
              <p className="text-[10px] font-bold text-accent tracking-wide uppercase mt-2">
                + {bookList.length - 3} more books
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 border-t border-hairline pt-4 text-center">
            <p className="text-xs text-ink-muted italic">No books on this shelf</p>
          </div>
        )}
      </Link>

      {isOwner && (
        <div className="mt-5 border-t border-hairline pt-3 flex items-center space-x-4">
          <button 
            onClick={() => onUpdate?.(shelf)} 
            className="text-xs font-bold text-accent hover:text-accent-hover transition-colors"
          >
            Rename Shelf
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); onDelete?.(shelf); }} 
            className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors ml-auto"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default ShelfCard;