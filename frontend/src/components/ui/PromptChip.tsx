import React from 'react';
import { Sparkles } from 'lucide-react';

interface PromptChipProps {
  text: string;
  onClick: (text: string) => void;
  langTag?: string;
}

/**
 * Adapted from Skiper UI:
 * Clickable prompt chips for voice/text querying with subtle lift.
 */
export const PromptChip: React.FC<PromptChipProps> = ({ text, onClick, langTag }) => {
  return (
    <button
      type="button"
      onClick={() => onClick(text)}
      className="group inline-flex items-center space-x-2 text-left px-3.5 py-2 text-xs rounded-full bg-white border border-ivory-dark hover:border-forest hover:bg-forest-50/50 transition-all text-charcoal hover:text-forest-dark shadow-xs"
    >
      <Sparkles className="w-3.5 h-3.5 text-harvest-dark group-hover:text-forest transition-colors shrink-0" />
      <span className="font-medium truncate max-w-xs sm:max-w-md">{text}</span>
      {langTag && (
        <span className="text-[10px] bg-ivory text-charcoal-muted px-1.5 py-0.5 rounded uppercase font-mono">
          {langTag}
        </span>
      )}
    </button>
  );
};
