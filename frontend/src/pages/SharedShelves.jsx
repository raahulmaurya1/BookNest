import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, FolderOpen } from 'lucide-react';

const SharedShelves = () => {
  const [shelfId, setShelfId] = useState('');
  const [recentShelves, setRecentShelves] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const recent = JSON.parse(localStorage.getItem('recent_shared_shelves') || '[]');
      setRecentShelves(recent);
    } catch (e) {
      console.error('Failed to load recent shelves from localStorage:', e);
    }
  }, []);

  const handleOpenShelf = (e) => {
    e.preventDefault();
    if (shelfId.trim()) {
      navigate(`/shelves/${shelfId.trim()}`);
    }
  };

  const handleClearHistory = () => {
    try {
      localStorage.removeItem('recent_shared_shelves');
      setRecentShelves([]);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 py-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center md:text-left">
        <h1 className="text-2xl font-serif font-bold text-ink tracking-tight">Shared Bookshelves</h1>
        <p className="text-xs font-semibold text-ink-muted mt-1">Access libraries shared by other readers via Shelf ID</p>
      </div>

      {/* Access Widget Card */}
      <div className="border border-hairline bg-white rounded-lg shadow-sm p-7">
        <div className="flex items-center space-x-3 mb-4">
          <Users className="w-8 h-8 text-accent" strokeWidth={1.5} />
          <div>
            <h2 className="text-base font-serif font-bold text-ink">Access Collaborator Shelf</h2>
            <p className="text-xs text-ink-muted mt-0.5">Enter a valid Shelf ID code to view its items and members</p>
          </div>
        </div>

        <form onSubmit={handleOpenShelf} className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            value={shelfId}
            onChange={(e) => setShelfId(e.target.value)}
            placeholder="Enter Shelf ID (e.g. 3)"
            className="input-field flex-1 py-3"
            required
          />
          <button type="submit" className="btn-primary whitespace-nowrap">
            Open Shelf
          </button>
        </form>
        <p className="text-[11px] text-ink-muted mt-3">
          You'll find the Shelf ID at the top of the shelf page, next to its name. It's different from your own User ID.
        </p>
      </div>

      {/* Recently Accessed History */}
      {recentShelves.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest">
              Recently Visited
            </h2>
            <button 
              onClick={handleClearHistory} 
              className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors"
            >
              Clear History
            </button>
          </div>

          <div className="space-y-3">
            {recentShelves.map((s) => (
              <Link
                key={s.id}
                to={`/shelves/${s.id}`}
                className="block p-5 border border-hairline bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3.5">
                    <FolderOpen className="w-5 h-5 text-accent" strokeWidth={1.5} />
                    <div>
                      <h3 className="font-serif font-bold text-ink text-sm">{s.name}</h3>
                      <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mt-0.5">Shelf ID: {s.id}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-accent hover:text-accent-hover transition-colors">
                    Enter Shelf →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedShelves;