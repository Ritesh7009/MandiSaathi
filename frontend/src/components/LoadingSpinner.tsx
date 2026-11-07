import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center py-10 space-y-3">
      <Loader2 className="w-8 h-8 text-forest animate-spin" />
      {message && <p className="text-sm text-charcoal-muted">{message}</p>}
    </div>
  );
};

