import React, { useState, useEffect } from 'react';

const ShelfForm = ({ initialData, onSubmit, onClose }) => {
  const [name, setName] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: 'Shelf name is required' });
      return;
    }
    setIsLoading(true);
    setErrors({});
    try {
      if (initialData) {
        await onSubmit(initialData.id, { name });
      } else {
        await onSubmit({ name });
      }
      onClose();
    } catch (error) {
      setErrors({ general: error.response?.data?.detail || error.response?.data?.error || 'Failed to save shelf' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white border border-hairline rounded-lg shadow-md p-7 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-serif font-bold text-ink tracking-tight">
            {initialData ? 'Rename Bookshelf' : 'Create Bookshelf'}
          </h2>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white hover:bg-paper flex items-center justify-center text-ink-muted hover:text-ink transition-colors"
          >
            ✕
          </button>
        </div>

        {errors.general && (
          <div className="mb-5 bg-red-50 border border-red-100 text-red-800 px-4 py-3 rounded-lg text-xs font-medium">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-ink-muted uppercase mb-2">Shelf Name *</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => { setName(e.target.value); if (errors.name) setErrors({ ...errors, name: null }); }} 
              className={`input-field ${errors.name ? 'input-error' : ''}`} 
              placeholder="e.g. Fiction, Science, Favorites" 
              required 
            />
            {errors.name && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.name}</p>}
          </div>

          <div className="flex justify-end space-x-3 pt-3 mt-6 border-t border-hairline">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-secondary flex-1 py-3" 
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isLoading} 
              className="btn-primary flex-1 py-3"
            >
              {isLoading ? 'Saving...' : initialData ? 'Rename' : 'Create Shelf'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShelfForm;