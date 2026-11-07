import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="max-w-md mx-auto py-16 px-4 text-center">
      <AlertTriangle className="w-12 h-12 text-harvest-dark mx-auto mb-4" />
      <h1 className="text-xl font-bold text-charcoal">Page Not Found</h1>
      <p className="text-sm text-charcoal-muted mt-2 mb-6">
        The requested resource does not exist in the MandiSaathi portal.
      </p>
      <Link
        to="/"
        className="inline-flex items-center space-x-2 px-4 py-2 bg-forest text-white text-xs font-semibold rounded hover:bg-forest-light transition-colors"
      >
        <Home className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
};

