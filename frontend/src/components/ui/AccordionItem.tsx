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
 * Editorial AgriTech Accordion Item
 * Minimal hairline border, smooth expanding content panel.
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
    <div className="border border-hairline rounded-xl bg-surface-white overflow-hidden transition-all duration-150 hover:border-forest/30 shadow-subtle">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
            <h3 className="font-semibold text-sm sm:text-base text-charcoal tracking-tight">{title}</h3>
            {badge && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-forest-50 text-forest border border-forest/20 font-mono">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-charcoal-muted mt-0.5 leading-relaxed truncate">{subtitle}</p>}
        </div>

        <div
          className={`p-1.5 rounded-full bg-ivory text-charcoal-muted transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-forest bg-forest-50' : ''
          }`}
        >
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-5 pt-2 sm:px-5 border-t border-hairline bg-surface/50 text-xs text-charcoal">
          {children}
        </div>
      )}
    </div>
  );
};
