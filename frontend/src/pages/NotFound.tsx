import React from 'react';
import { Link } from 'react-router-dom';
import { House, Warning } from '@phosphor-icons/react';

export const NotFound: React.FC = () => {
  return (
    <div className="max-w-md mx-auto py-20 px-4 text-center">
      <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-saffron-soft border border-saffron/30 flex items-center justify-center">
        <Warning weight="duotone" className="w-7 h-7 text-saffron" />
      </div>
      <h1 className="font-display text-2xl font-bold text-ink tracking-tight">Page Not Found</h1>
      <p className="text-sm text-ink-muted mt-2 mb-6 leading-relaxed">
        The requested route does not exist in the MandiSaathi portal.
      </p>
      <Link
        to="/"
        className="inline-flex items-center space-x-2 px-5 py-2.5 bg-canopy hover:brightness-110 text-white text-xs font-semibold rounded-full transition-all shadow-subtle"
      >
        <House weight="duotone" className="w-4 h-4" />
        <span>Return to Voice Studio</span>
      </Link>
    </div>
  );
};
