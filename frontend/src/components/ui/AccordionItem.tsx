import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionItemProps {
  title: string;
  badge?: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/**
 * Adapted from Motion Primitives:
 * Accessible, minimal accordion panel for schemes and details.
 */
export const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  badge,
  subtitle,
  children,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-ivory-dark rounded-md bg-white overflow-hidden transition-colors hover:border-forest/40">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
        aria-expanded={isOpen}
      >
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-sm sm:text-base text-charcoal">{title}</h3>
            {badge && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-harvest-50 text-forest-dark border border-harvest/40">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-charcoal-muted mt-1">{subtitle}</p>}
        </div>

        <div
          className={`p-1.5 rounded-full bg-ivory text-charcoal-muted transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-forest' : ''
          }`}
        >
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-5 pt-1 sm:px-5 border-t border-ivory-dark/60 bg-ivory/20 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
};

