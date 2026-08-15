import React from 'react';

const ErrorMessage = ({ error, onRetry }) => {
  if (!error) return null;

  const message = typeof error === 'string' ? error : error.message || 'An unexpected error occurred';

  return (
    <div className="bg-red-50 border border-red-100 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 bg-red-100 rounded-lg p-1.5 text-red-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 pt-0.5">
            <p className="text-sm font-medium text-ink">Error Encountered</p>
            <p className="text-xs text-ink-muted mt-0.5">{message}</p>
          </div>
        </div>
        {onRetry && (
          <button 
            onClick={onRetry} 
            className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-all duration-200"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;