import React, { useState } from 'react';
import Paper from '../models/Paper';

interface CiteModalProps {
  paper: Paper | null;
  onClose: () => void;
}

export const CiteModal: React.FC<CiteModalProps> = ({ paper, onClose }) => {
  const [copied, setCopied] = useState(false);
  if (!paper) return null;

  const handleCopy = () => {
    if (paper.bibtex) {
      navigator.clipboard.writeText(paper.bibtex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface-raised border border-surface-border rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">menu_book</span>
            <h3 className="text-headline-sm font-semibold text-text-primary">Cite Preprint</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <p className="text-body-sm text-text-secondary">
          Export citation in standard BibTeX format for academic papers and bibliography tools.
        </p>

        <pre className="bg-surface-dim border border-surface-border p-3.5 rounded-lg text-label-sm font-label-sm text-text-primary overflow-x-auto whitespace-pre font-mono">
          {paper.bibtex}
        </pre>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface-container text-text-secondary hover:text-text-primary text-label-md font-label-md transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold text-label-md font-label-md hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            <span>{copied ? 'Copied to Clipboard!' : 'Copy BibTeX'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
