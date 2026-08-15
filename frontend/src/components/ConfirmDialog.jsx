import React, { useEffect } from 'react';

const ConfirmDialog = ({ 
  open, 
  title = "Are you sure?", 
  message, 
  confirmLabel = "Delete", 
  cancelLabel = "Cancel", 
  destructive = true, 
  onConfirm, 
  onCancel, 
}) => { 
  // Handle escape key to cancel
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null; 

  // Handle clicking outside the modal content
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return ( 
    <div 
      className="fixed inset-0 bg-transparent flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    > 
      <div className="bg-white border border-hairline rounded-lg shadow-md max-w-sm w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}> 
        <h3 className="font-serif text-lg text-ink mb-2">{title}</h3> 
        {message && <p className="text-sm text-ink-muted mb-6 leading-relaxed">{message}</p>} 
        <div className="flex justify-end gap-3 mt-4"> 
          {cancelLabel && (
            <button 
              onClick={onCancel} 
              className="btn-secondary" 
            > 
              {cancelLabel} 
            </button> 
          )}
          <button 
            onClick={onConfirm} 
            className={destructive ? "btn-danger" : "btn-primary"} 
          > 
            {confirmLabel} 
          </button> 
        </div> 
      </div> 
    </div> 
  ); 
};

export default ConfirmDialog;
