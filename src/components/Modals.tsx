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

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-surface-raised border border-surface-border rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 text-text-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with App Logo & Close Button */}
        <div className="flex items-start justify-between border-b border-surface-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
              <span className="material-symbols-outlined text-[24px]">auto_stories</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-headline-md font-bold tracking-tight text-text-primary">
                  PaperFeed
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  v1.0
                </span>
              </div>
              <p className="text-body-sm text-text-muted">
                Preprint feed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <p className="text-body-md text-text-secondary leading-relaxed">
          Infinite scroll research paper feed for bathroom breaks.
        </p>

        <div className="flex flex-col gap-2">
          <span className="text-label-sm font-semibold text-text-muted uppercase tracking-wider">
            Connected Repositories
          </span>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container border border-surface-border">
              <span className="w-2.5 h-2.5 rounded-full bg-arxiv-red shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-label-md text-text-primary">arXiv</div>
                <div className="text-[11px] text-text-muted">Physics, CS, Math</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container border border-surface-border">
              <span className="w-2.5 h-2.5 rounded-full bg-biorxiv-blue shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-label-md text-text-primary">bioRxiv</div>
                <div className="text-[11px] text-text-muted">Life Sciences</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container border border-surface-border">
              <span className="w-2.5 h-2.5 rounded-full bg-chemrxiv-amber shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-label-md text-text-primary">chemRxiv</div>
                <div className="text-[11px] text-text-muted">Chemistry</div>
              </div>
            </div>
          </div>
        </div>

        {/* MinishLab Engine Callout */}
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">
            neurology
          </span>
          <div className="text-body-sm text-text-secondary leading-relaxed">
            <span className="font-semibold text-text-primary">MinishLab Recommender:</span> Powered by{' '}
            <span className="text-primary font-medium">MinishLab's model2vec</span> (
            <code className="text-[11px] font-mono bg-surface-dim px-1 py-0.5 rounded text-text-primary">
              potion-base-2M
            </code>
            ) running entirely client-side in your browser via WebGPU/WASM for instant vector embeddings and zero-latency recommendations.
          </div>
        </div>

        {/* Core Capabilities */}
        <div className="flex flex-col gap-2">
          <span className="text-label-sm font-semibold text-text-muted uppercase tracking-wider">
            Features & Shortcuts
          </span>
          <ul className="text-body-sm text-text-secondary space-y-1.5 list-disc list-inside">
            <li>
              <span className="font-medium text-text-primary">MinishLab Embedding Ranker:</span> Automatically personalizes and re-ranks preprints based on cosine similarity against papers you liked.
            </li>
            <li>
              <span className="font-medium text-text-primary">Instant Citation:</span> 1-click BibTeX generation ready for LaTeX.
            </li>
            <li>
              <span className="font-medium text-text-primary">Keyboard Navigation:</span> Press <kbd className="px-1.5 py-0.5 rounded bg-surface-dim border border-surface-border font-mono text-[11px]">J</kbd>/<kbd className="px-1.5 py-0.5 rounded bg-surface-dim border border-surface-border font-mono text-[11px]">K</kbd> to navigate, <kbd className="px-1.5 py-0.5 rounded bg-surface-dim border border-surface-border font-mono text-[11px]">L</kbd> to like, <kbd className="px-1.5 py-0.5 rounded bg-surface-dim border border-surface-border font-mono text-[11px]">S</kbd> to save.
            </li>
            <li>
              <span className="font-medium text-text-primary">Local & Private:</span> Your library and reading history stay 100% in your browser.
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-surface-border">
          <span className="text-[12px] text-text-muted">
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold text-label-md hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};


