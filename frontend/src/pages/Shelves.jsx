import React, { useState, useEffect } from 'react';
import { shelvesAPI } from '../api/shelves';
import ShelfCard from '../components/ShelfCard';
import ShelfForm from '../components/ShelfForm';
import Loading from '../components/Loading';
import ConfirmDialog from '../components/ConfirmDialog';
import { FolderOpen } from 'lucide-react';

const Shelves = () => {
  const [shelves, setShelves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingShelf, setEditingShelf] = useState(null);

  useEffect(() => {
    fetchShelves();
    const onFocus = () => fetchShelves();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const fetchShelves = async () => {
    try {
      const response = await shelvesAPI.getAll();
      setShelves(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load shelves');
      console.error('Shelves fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data) => {
    try { 
      await shelvesAPI.create(data); 
      setShowForm(false); 
      fetchShelves(); 
    } 
    catch (err) { 
      throw err; 
    }
  };

  const handleUpdate = async (id, data) => {
    try { 
      await shelvesAPI.update(id, data); 
      setEditingShelf(null); 
      setShowForm(false); 
      fetchShelves(); 
    } 
    catch (err) { 
      throw err; 
    }
  };

  const [confirmDeleteShelf, setConfirmDeleteShelf] = useState(null);

  const handleDeleteClick = (shelf) => setConfirmDeleteShelf(shelf);
  const handleConfirmDelete = async () => {
    try { 
      await shelvesAPI.delete(confirmDeleteShelf.id); 
      fetchShelves(); 
    } 
    catch (err) { 
      console.error('Delete error:', err);
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to delete shelf');
    } finally {
      setConfirmDeleteShelf(null);
    }
  };

  if (loading && shelves.length === 0) {
    return <Loading message="Loading shelves..." fullPage={true} />;
  }

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-white border border-hairline p-6 rounded-lg shadow-sm">
        <div>
          <h1 className="text-2xl font-serif font-bold text-ink tracking-tight">My Bookshelves</h1>
          <p className="text-xs font-semibold text-ink-muted mt-1">Organize books into shelves and share them with friends</p>
        </div>
        <button 
          onClick={() => { setEditingShelf(null); setShowForm(true); }} 
          className="btn-primary"
        >
          Create Shelf
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-800 px-4 py-3 rounded-lg text-xs font-medium">
          {error}
        </div>
      )}

      {/* Shelves Grid */}
      {shelves.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-hairline rounded-lg p-8 max-w-md mx-auto">
          <FolderOpen className="w-10 h-10 text-ink-muted mx-auto mb-2" strokeWidth={1.5} />
          <h3 className="mt-4 text-base font-serif font-bold text-ink">No shelves created</h3>
          <p className="text-xs text-ink-muted mt-1 max-w-xs mx-auto">
            Create bookshelves to categorize your books (e.g. Classics, Sci-Fi) and collaborate with other users.
          </p>
          <button 
            onClick={() => { setEditingShelf(null); setShowForm(true); }} 
            className="mt-6 btn-primary"
          >
            Create Your First Shelf
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shelves.map((shelf) => (
            <ShelfCard 
              key={shelf.id} 
              shelf={shelf} 
              isOwner={true} 
              onUpdate={() => { setEditingShelf(shelf); setShowForm(true); }} 
              onDelete={handleDeleteClick} 
            />
          ))}
        </div>
      )}

      {showForm && (
        <ShelfForm 
          initialData={editingShelf} 
          onSubmit={editingShelf ? handleUpdate : handleCreate} 
          onClose={() => { setShowForm(false); setEditingShelf(null); }} 
        />
      )}

      <ConfirmDialog 
        open={confirmDeleteShelf !== null} 
        title={confirmDeleteShelf ? `Delete "${confirmDeleteShelf.name}"?` : "Delete this shelf?"} 
        message="Books on this shelf will stay in your library. Only the shelf itself will be removed." 
        confirmLabel="Delete Shelf"
        destructive={true}
        onConfirm={handleConfirmDelete} 
        onCancel={() => setConfirmDeleteShelf(null)} 
      />
    </div>
  );
};

export default Shelves;