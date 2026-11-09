import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface PromptChipProps {
  text: string;
  onClick: (text: string) => void;
  langTag?: string;
}

/**
 * Editorial AgriTech Prompt Chip
 * High-legibility farmer suggestion chip with tactile feedback.
 */
export const PromptChip: React.FC<PromptChipProps> = ({ text, onClick, langTag }) => {
  return (
    <button
      type="button"
      onClick={() => onClick(text)}
      className="group inline-flex items-center space-x-2 text-left px-3.5 py-1.5 text-xs rounded-full bg-surface-white border border-hairline hover:border-forest/40 hover:bg-forest-50/50 transition-all duration-150 text-charcoal hover:text-forest active:scale-[0.98] shadow-subtle cursor-pointer"
    >
      <ArrowUpRight className="w-3.5 h-3.5 text-harvest-dark group-hover:text-forest group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
      <span className="font-medium truncate max-w-xs sm:max-w-md">{text}</span>
      {langTag && (
        <span className="text-[10px] bg-ivory text-charcoal-muted px-1.5 py-0.2 rounded font-mono font-semibold">
          {langTag}
        </span>
      )}
    </button>
  );
};
