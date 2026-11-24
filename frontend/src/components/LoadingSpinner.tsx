import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

/**
 * Editorial Shimmer Loader (replaces generic spinning circles with structural shape placeholders).
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  return (
    <div className="w-full space-y-4 py-4" role="status" aria-label={message || 'Loading'}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl ms-shimmer border border-line" />
        ))}
      </div>
      <div className="h-52 rounded-2xl ms-shimmer border border-line" />
      {message && <p className="text-xs font-mono text-center text-ink-muted">{message}</p>}
    </div>
  );
};
