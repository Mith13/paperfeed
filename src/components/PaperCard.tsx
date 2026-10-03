import React, { useState } from 'react';
import Paper from '../models/Paper';
import RecommenderEngine from '../services/RecommenderEngine';

export interface PaperCardProps {
  paper: Paper;
  index?: number;
  isLiked: boolean;
  isSaved: boolean;
  savedPapersCount: number;
  matchPercentage?: number;
  mode?: 'mobile' | 'desktop';
  className?: string;
  onLikeToggle: (paper: Paper, isLiked: boolean) => void;
  onSaveToggle: (paper: Paper) => void;
  onOpenCite: (paper: Paper) => void;
  onShare: (paper: Paper) => void;
  onRead?: (paper: Paper) => void;
}

/**
 * Calculates cosine similarity match percentage between a paper and user's saved library
 */
export function calculateMatchPercentage(paper: Paper, savedList: Paper[]): number {
  if (!savedList || savedList.length === 0) {
    return 0;
  }
  if (savedList.some((p) => p.id === paper.id)) {
    return 100;
  }

  // Precomputed embedding similarity
  if (paper.embedding && paper.embedding.length > 0) {
    let highestScore = 0;
    for (const s of savedList) {
      if (s.embedding && s.embedding.length > 0) {
        const score = RecommenderEngine.cosineSimilarity(paper.embedding, s.embedding);
        if (score > highestScore) {
          highestScore = score;
        }
      } else {
        console.warn('[PaperCard] Embedding for ${paper.id} is unavailable');
      }
    }
    if (highestScore > 0) {
      return Math.min(99, Math.max(8, Math.round(highestScore * 100)));
    }
  }

  // Fallback tag-based matching when vector embeddings are being computed
  let maxShared = 0;
  for (const s of savedList) {
    const shared = (paper.tags || []).filter((t) => (s.tags || []).includes(t)).length;
    if (shared > maxShared) maxShared = shared;
  }
  if (maxShared > 0) {
    return Math.min(95, 40 + maxShared * 15);
  }

  return 0;
}

export const PaperCard: React.FC<PaperCardProps> = ({
  paper,
  index = 0,
  isLiked,
  isSaved,
  savedPapersCount,
  matchPercentage = 0,
  mode = 'desktop',
  className = '',
  onLikeToggle,
  onSaveToggle,
  onOpenCite,
  onShare,
  onRead,
}) => {
  const isDesktop = mode === 'desktop';
  const [isAbstractExpanded, setIsAbstractExpanded] = useState<boolean>(false);
  const isLongAbstract = (paper.abstract || '').length > 180 || paper.abstractParagraphs.length > 1;

  // Base article styling based on viewport mode: strictly contains headers and bottom button bar
  const defaultArticleClass = isDesktop
    ? 'card-glass-hover w-full max-w-[620px] h-[calc(100%-0.5rem)] min-h-[580px] max-h-[740px] rounded-2xl bg-surface-raised border border-surface-border shadow-2xl relative flex flex-col justify-between overflow-hidden cursor-default'
    : 'card-glass-hover snap-card snap-always w-full h-[calc(100dvh-176px)] max-h-[calc(100dvh-176px)] flex-none flex flex-col my-0 bg-surface-raised border border-surface-border rounded-xl shadow-2xl relative overflow-hidden';

  return (
    <article className={`${defaultArticleClass} ${className}`.trim()}>
      {/* Top Gradient Highlight Line (Source Color Scheme) */}
      <div
        className={`h-1 w-full bg-gradient-to-r opacity-80 ${
          paper.source === 'arXiv'
            ? 'from-arxiv-red via-primary to-transparent'
            : paper.source === 'bioRxiv'
            ? 'from-biorxiv-blue via-sky-400 to-transparent'
            : 'from-chemrxiv-amber via-yellow-400 to-transparent'
        }`}
      />

      {/* Card Body Area */}
      <div
        className={`flex-1 overflow-y-auto no-scrollbar flex flex-col ${
          isDesktop ? 'p-space-lg gap-4' : 'p-space-md sm:p-space-lg gap-3 sm:gap-4'
        }`}
      >
        {/* Metadata Header Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-label-sm font-label-sm">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Repository Origin Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-label-md font-medium ${
                paper.source === 'arXiv'
                  ? 'bg-arxiv-red/10 border border-arxiv-red/40 text-arxiv-red'
                  : paper.source === 'bioRxiv'
                  ? 'bg-biorxiv-blue/10 border border-biorxiv-blue/40 text-biorxiv-blue'
                  : 'bg-chemrxiv-amber/10 border border-chemrxiv-amber/40 text-chemrxiv-amber'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  paper.source === 'arXiv'
                    ? 'bg-arxiv-red'
                    : paper.source === 'bioRxiv'
                    ? 'bg-biorxiv-blue'
                    : 'bg-chemrxiv-amber'
                }`}
              />
              {paper.source} {isDesktop ? paper.id.replace('http://arxiv.org/abs/', '').slice(0, isDesktop ? 28 : 24) : ""}
            </span>

            {/* Publication Date */}
            <span className="text-text-muted flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]" data-icon="schedule">
                schedule
              </span>
              {paper.formattedDate}
            </span>
          </div>

          {/* Library Relevance Score Pill */}
          <div
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-label-sm font-label-sm transition-colors ${
              matchPercentage > 0
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-surface-container border-surface-border text-text-muted'
            }`}
            title={
              savedPapersCount > 0
                ? `${matchPercentage}% relevance relative to your ${savedPapersCount} saved paper(s)`
                : '0% relative to saved papers (save papers to library to calculate relative match)'
            }
          >
            <span className="material-symbols-outlined text-[13px]" data-icon="percent">
              percent
            </span>
            <span>{matchPercentage}% relative to saved papers</span>
          </div>
        </div>

        {/* Paper Title */}
        <h1
          className={`text-text-primary tracking-tight font-bold leading-snug ${
            isDesktop
              ? 'text-headline-md sm:text-headline-lg font-headline-lg'
              : 'font-headline-lg-mobile text-headline-lg-mobile sm:text-headline-lg'
          }`}
        >
          {paper.title}
        </h1>

        {/* Authors */}
        <div className="flex items-center gap-2 flex-wrap text-body-sm font-body-sm text-text-secondary">
          <span className="font-medium text-text-primary">{paper.authors}</span>
        </div>

        {/* Abstract Section */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-surface-border/60">
          <div className="flex items-center justify-between">
            <span className="text-label-sm font-label-sm font-semibold tracking-wider text-text-muted uppercase">
              Abstract
            </span>
            {isLongAbstract && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAbstractExpanded(!isAbstractExpanded);
                }}
                className="flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline cursor-pointer select-none"
              >
                <span>{isAbstractExpanded ? 'Show less' : 'Show full'}</span>
                <span className="material-symbols-outlined text-[15px]">
                  {isAbstractExpanded ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            )}
          </div>

          <div
            onClick={() => isLongAbstract && setIsAbstractExpanded(!isAbstractExpanded)}
            className={`text-body-md font-body-md text-text-secondary leading-relaxed transition-colors ${
              isLongAbstract ? 'cursor-pointer hover:text-text-primary group' : ''
            }`}
            title={
              isLongAbstract
                ? isAbstractExpanded
                  ? 'Click to collapse abstract'
                  : 'Click to unroll full abstract'
                : undefined
            }
          >
            {isAbstractExpanded ? (
              <div className="space-y-2 animate-in fade-in duration-200">
                {paper.abstractParagraphs.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            ) : (
              <div className="relative">
                <p className={isDesktop ? 'line-clamp-4' : 'line-clamp-3 sm:line-clamp-4'}>
                  {paper.abstract}
                </p>
                {isLongAbstract && (
                  <span className="inline-flex items-center gap-0.5 text-primary text-[11px] font-semibold mt-1 group-hover:underline">
                    <span>Read more</span>
                    <span className="material-symbols-outlined text-[13px]">expand_more</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Topics & Tags Rail */}
        <div className="flex items-center gap-2 flex-wrap pt-1 sm:pt-2">
          {(paper.tags?.length > 0 ? paper.tags : ['quant-ph']).map((t, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded bg-surface-container border border-surface-border-subtle text-label-sm font-label-sm text-text-secondary"
            >
              {t.startsWith('#') ? t : `#${t}`}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Card Action Bar */}
      <div
        className={`flex-none bg-surface-container-low border-t border-surface-border flex items-center justify-between gap-1 sm:gap-2 ${
          isDesktop ? 'px-space-lg py-3' : 'px-2 py-1.5'
        }`}
      >
        {/* Left Primary Action: Read & Cite */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Read Action: Inline viewer for desktop if onRead provided, else direct PDF link */}
          {isDesktop && onRead ? (
            <button
              onClick={() => onRead(paper)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary font-headline-sm font-semibold text-[14px] hover:opacity-90 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]" data-icon="picture_as_pdf">
                picture_as_pdf
              </span>
              <span>Read Full Paper</span>
            </button>
          ) : (
            <a
              className={`inline-flex items-center gap-1 rounded-lg bg-primary text-on-primary font-semibold hover:opacity-90 transition-all shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                isDesktop ? 'px-4 py-2 text-[14px]' : 'px-2 py-1 text-[12px]'
              }`}
              href={paper.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`Open PDF directly on ${paper.source}`}
            >
              <span
                className="material-symbols-outlined text-[15px] sm:text-[17px]"
                data-icon="picture_as_pdf"
              >
                picture_as_pdf
              </span>
              <span>{isDesktop ? 'Read PDF' : 'PDF'}</span>
              {isDesktop && <span className="material-symbols-outlined text-[13px]">open_in_new</span>}
            </a>
          )}

          {/* Cite Button */}
          <button
            onClick={() => onOpenCite(paper)}
            className={`inline-flex items-center gap-1 rounded-lg bg-surface-raised hover:bg-surface-container border border-surface-border text-text-secondary hover:text-text-primary transition-colors cursor-pointer shrink-0 ${
              isDesktop ? 'px-3 py-2 text-label-md font-label-md' : 'px-2 py-1 text-[12px]'
            }`}
            title={`Cite Preprint (BibTeX)${paper.citations > 0 ? ` • ${paper.citations} citations` : ''}`}
          >
            <span
              className="material-symbols-outlined text-[14px] sm:text-[16px]"
              data-icon="menu_book"
            >
              menu_book
            </span>
            <span>Cite</span>
          </button>
        </div>

        {/* Right Action Group: Like, Save, Share */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Like Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLikeToggle(paper, !isLiked);
            }}
            className={`inline-flex items-center gap-1 rounded-lg border transition-all cursor-pointer font-medium shadow-xs active:scale-95 shrink-0 ${
              isDesktop ? 'px-3 py-2 text-label-md' : 'px-2 py-1 text-[12px]'
            } ${
              isLiked
                ? 'border-arxiv-red/60 text-arxiv-red bg-arxiv-red/15 font-semibold'
                : 'bg-surface-raised hover:bg-surface-container border-surface-border text-text-secondary hover:text-arxiv-red hover:border-arxiv-red/40'
            }`}
            id={index === 0 ? 'likeBtn' : undefined}
            title={isLiked ? 'Unlike (Remove from Liked Papers)' : 'Like (Add to Liked Papers)'}
          >
            <span
              className="material-symbols-outlined text-[15px] sm:text-[18px]"
              style={{
                fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0",
              }}
              data-icon="favorite"
            >
              favorite
            </span>
            <span className="font-medium text-[12px]">
              {isLiked ? 'Liked' : 'Like'}
            </span>
          </button>

          {/* Save Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSaveToggle(paper);
            }}
            className={`inline-flex items-center gap-1 rounded-lg border transition-all cursor-pointer font-medium shadow-xs active:scale-95 shrink-0 ${
              isDesktop ? 'px-3 py-2 text-label-md' : 'px-2 py-1 text-[12px]'
            } ${
              isSaved
                ? 'border-primary/50 text-primary bg-primary/10 font-semibold'
                : 'bg-surface-raised hover:bg-surface-container text-text-secondary hover:text-primary hover:border-primary/40 border-surface-border'
            }`}
            id={index === 0 ? 'saveBtn' : undefined}
            title={isSaved ? 'Remove from Library' : 'Save to Library'}
          >
            <span
              className="material-symbols-outlined text-[15px] sm:text-[18px]"
              style={{
                fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0",
              }}
              data-icon="bookmark_add"
            >
              bookmark_add
            </span>
            <span className="font-medium text-[12px]">
              {isSaved ? 'Saved' : 'Save'}
            </span>
          </button>

          {/* Share Preprint Button */}
          <button
            onClick={() => onShare(paper)}
            className={`inline-flex items-center justify-center rounded-lg bg-surface-raised hover:bg-surface-container border border-surface-border text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 ${
              isDesktop ? 'p-2' : 'p-1.5'
            }`}
            title="Share Preprint"
            aria-label="Share Preprint"
          >
            <span
              className="material-symbols-outlined text-[15px] sm:text-[18px]"
              data-icon="share"
            >
              share
            </span>
          </button>
        </div>
      </div>
    </article>
  );
};

export default PaperCard;
