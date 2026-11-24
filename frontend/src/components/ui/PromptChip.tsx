import React from 'react';
import { ArrowUpRight } from '@phosphor-icons/react';

interface PromptChipProps {
  text: string;
  onClick: (text: string) => void;
  langTag?: string;
}

export const PromptChip: React.FC<PromptChipProps> = ({ text, onClick, langTag }) => {
  return (
    <button
      type="button"
      onClick={() => onClick(text)}
      className="group w-full sm:w-auto max-w-full inline-flex items-center gap-2 text-left px-3.5 py-2.5 min-h-[44px] text-xs rounded-2xl bg-surface border border-line hover:border-canopy/40 hover:bg-canopy-soft transition-all duration-150 text-ink active:scale-[0.98] shadow-subtle cursor-pointer"
    >
      <ArrowUpRight
        weight="bold"
        className="w-3.5 h-3.5 text-saffron group-hover:text-canopy dark:group-hover:text-canopy-bright group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0"
      />
      <span className="font-medium flex-1 min-w-0 truncate sm:flex-initial sm:max-w-md">{text}</span>
      {langTag && (
        <span className="text-[10px] bg-surface-subtle text-ink-muted px-1.5 py-0.5 rounded font-mono font-semibold shrink-0">
          {langTag}
        </span>
      )}
    </button>
  );
};
