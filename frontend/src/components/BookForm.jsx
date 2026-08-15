import React, { useState, useEffect } from 'react';

const BookForm = ({ initialData, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    status: 'Want to Read',
    total_pages: '',
    rating: '',
    notes: '',
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        author: initialData.author || '',
        status: initialData.status || 'Want to Read',
        total_pages: initialData.total_pages || '',
        rating: initialData.rating || '',
        notes: initialData.notes || '',
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? (value ? parseInt(value) : '') : value,
    });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setPdfFile(null);
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrors({ ...errors, pdfFile: 'Only PDF files are allowed' });
      setPdfFile(null);
      return;
    }
    if (file.size > 52428800) { // 50 MB
      setErrors({ ...errors, pdfFile: 'File size must be under 50 MB' });
      setPdfFile(null);
      return;
    }
    if (errors.pdfFile) {
      setErrors({ ...errors, pdfFile: null });
    }
    setPdfFile(file);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.author.trim()) newErrors.author = 'Author is required';
    if (!formData.status) newErrors.status = 'Status is required';
    if (formData.total_pages && formData.total_pages < 1) {
      newErrors.total_pages = 'Total pages must be at least 1';
    }
    if (formData.rating && (formData.rating < 1 || formData.rating > 5)) {
      newErrors.rating = 'Rating must be between 1 and 5';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setIsLoading(true);
    setErrors({});
    try {
      const dataToSubmit = {
        ...formData,
        total_pages: formData.total_pages ? parseInt(formData.total_pages) : undefined,
        rating: formData.rating ? parseInt(formData.rating) : undefined,
      };
      if (initialData) {
        await onSubmit(initialData.id, dataToSubmit, pdfFile);
      } else {
        await onSubmit(dataToSubmit, pdfFile);
      }
      onClose();
    } catch (error) {
      const detail = error.response?.data?.detail;
      let errorMsg = 'Failed to save book';
      if (Array.isArray(detail)) {
        errorMsg = detail.map(e => `${e.loc.slice(-1)[0]}: ${e.msg}`).join(', ');
      } else if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      }
      setErrors({ general: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-lg p-7 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-md border border-hairline">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {initialData ? 'Edit Book Info' : 'Add New Book'}
          </h2>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {errors.general && (
          <div className="mb-5 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-2xl text-xs font-semibold">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Title *</label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              placeholder="e.g. The Hobbit"
              className={`input-field ${errors.title ? 'input-error' : ''}`} 
              required 
            />
            {errors.title && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Author *</label>
            <input 
              type="text" 
              name="author" 
              value={formData.author} 
              onChange={handleChange} 
              placeholder="e.g. J.R.R. Tolkien"
              className={`input-field ${errors.author ? 'input-error' : ''}`} 
              required 
            />
            {errors.author && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.author}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Status *</label>
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleChange} 
                className="input-field" 
                required
              >
                <option value="Want to Read">Want to Read</option>
                <option value="Reading">Reading</option>
                <option value="Finished">Finished</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Total Pages</label>
              <input 
                type="number" 
                name="total_pages" 
                value={formData.total_pages} 
                onChange={handleChange} 
                placeholder="e.g. 310"
                min="1" 
                className={`input-field ${errors.total_pages ? 'input-error' : ''}`} 
              />
              {errors.total_pages && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.total_pages}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Upload PDF (Optional)</label>
            <div className="mt-1 border border-dashed border-slate-200 hover:border-primary-400 rounded-2xl p-4 bg-slate-50/50 transition-colors flex flex-col items-center">
              <input 
                type="file" 
                accept=".pdf,application/pdf" 
                onChange={handleFileChange} 
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100 cursor-pointer" 
              />
              <p className="text-[10px] text-slate-400 mt-2">PDF files up to 50MB</p>
            </div>
            {errors.pdfFile && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.pdfFile}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Rating (1-5)</label>
              <input 
                type="number" 
                name="rating" 
                value={formData.rating} 
                onChange={handleChange} 
                placeholder="e.g. 5"
                min="1" 
                max="5" 
                className={`input-field ${errors.rating ? 'input-error' : ''}`} 
              />
              {errors.rating && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.rating}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Notes</label>
            <textarea 
              name="notes" 
              value={formData.notes} 
              onChange={handleChange} 
              rows="3" 
              className="input-field" 
              placeholder="Add your reading thoughts or notes..." 
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-50 mt-6">
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
              {isLoading ? 'Saving...' : initialData ? 'Update' : 'Add Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookForm;