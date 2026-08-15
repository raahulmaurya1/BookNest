import React from 'react';

const Loading = ({ message = 'Loading...', fullPage = false }) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className="relative flex items-center justify-center">
        {/* Outer Spinner */}
        <div className="spinner w-10 h-10"></div>
      </div>
      <p className="mt-4 text-xs font-semibold tracking-wider text-ink-muted uppercase">
        {message}
      </p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        {content}
      </div>
    );
  }

  return content;
};

export default Loading;