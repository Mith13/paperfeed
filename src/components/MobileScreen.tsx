import React, { useRef, useState, useEffect } from 'react';
import Paper from '../models/Paper';
import { AppTheme } from '../utils/theme';
import { PaperCard, calculateMatchPercentage } from './PaperCard';
import { TimeRange, filterPapersByTimeRange } from '../utils/timeRange';

interface MobileScreenProps {
  papers: Paper[];
  likedPapers: Paper[];
  savedPapers: Paper[];
  onNavigateToDesktop: (transition: 'push', paper?: Paper) => void;
  onOpenCite: (paper: Paper) => void;
  onLikeToggle: (paper: Paper, isLiked: boolean) => void;
  onSaveToggle: (paper: Paper) => void;
  onSearch: (query: string) => void;
  searchQuery?: string;
  isSearching?: boolean;
  onFilterToggle: (source: string) => void;
  activeSources: Record<string, boolean>;
  onOpenSettings: () => void;
  onScrollDirection?: (dir: 'up' | 'down') => void;
  theme?: AppTheme;
  onThemeChange?: (theme: AppTheme) => void;
  timeRange?: TimeRange;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
  onLoadMore?: () => void;
  isFetchingMore?: boolean;
  hasMore?: boolean;
}

export const MobileScreen: React.FC<MobileScreenProps> = ({
  papers,
  likedPapers,
  savedPapers,
  onNavigateToDesktop,
  onOpenCite,
  onLikeToggle,
  onSaveToggle,
  onSearch,
  searchQuery: initialSearchQuery,
  isSearching = false,
  onFilterToggle,
  activeSources,
  onOpenSettings,
  onScrollDirection,
  theme = 'system',
  onThemeChange,
  timeRange: propTimeRange,
  onTimeRangeChange,
  onLoadMore,
  isFetchingMore = false,
  hasMore = true,
}) => {
  const streamRef = useRef<HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '"coupled+cluster"');
  const [localTimeRange, setLocalTimeRange] = useState<TimeRange>('all time');
  const activeTimeRange = propTimeRange ?? localTimeRange;
  const [activeMobileIndex, setActiveMobileIndex] = useState<number>(0);

  const handleTimeRangeSelect = (tr: TimeRange) => {
    if (onTimeRangeChange) {
      onTimeRangeChange(tr);
    } else {
      setLocalTimeRange(tr);
    }
  };

  const [activeNav, setActiveNav] = useState<'feed' | 'library' | 'settings'>('feed');
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);

  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  const isLiked = (paperId: string) => likedPapers.some((p) => p.id === paperId);
  const isSaved = (paperId: string) => savedPapers.some((p) => p.id === paperId);

  const basePapers = activeNav === 'library' ? savedPapers : papers;
  const displayPapers = filterPapersByTimeRange(basePapers, activeTimeRange);

  // Jump back to the first card when switching between Feed and Library
  useEffect(() => {
    streamRef.current?.scrollTo({ top: 0 });
    setActiveMobileIndex(0);
  }, [activeNav]);

  const scrollToNextCard = () => {
    onScrollDirection?.('down');
    if (streamRef.current) {
      const cardHeight = streamRef.current.clientHeight || 500;
      const nextIndex = activeMobileIndex + 1;
      streamRef.current.scrollBy({ top: cardHeight, behavior: 'smooth' });
      if (nextIndex < displayPapers.length) {
        setActiveMobileIndex(nextIndex);
        if (
          activeNav === 'feed' &&
          hasMore &&
          !isFetchingMore &&
          displayPapers.length >= 2 &&
          nextIndex >= displayPapers.length - 2
        ) {
          onLoadMore?.();
        }
      }
    }
  };

  const scrollToPrevCard = () => {
    onScrollDirection?.('up');
    if (streamRef.current) {
      const cardHeight = streamRef.current.clientHeight || 500;
      const prevIndex = Math.max(0, activeMobileIndex - 1);
      streamRef.current.scrollBy({ top: -cardHeight, behavior: 'smooth' });
      setActiveMobileIndex(prevIndex);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const container = e.currentTarget;
    const cardHeight = container.clientHeight || 500;
    const currentIndex = Math.round(container.scrollTop / cardHeight);
    if (currentIndex !== activeMobileIndex && currentIndex >= 0 && currentIndex < displayPapers.length) {
      setActiveMobileIndex(currentIndex);
    }

    // Trigger loading of new papers when N-2 paper is displayed
    if (
      activeNav === 'feed' &&
      hasMore &&
      !isFetchingMore &&
      displayPapers.length >= 2 &&
      currentIndex >= displayPapers.length - 2
    ) {
      onLoadMore?.();
    }
  };

  // Trigger loading when activeMobileIndex reaches N-2 paper
  useEffect(() => {
    if (
      activeNav === 'feed' &&
      hasMore &&
      !isFetchingMore &&
      displayPapers.length >= 2 &&
      activeMobileIndex >= displayPapers.length - 2
    ) {
      onLoadMore?.();
    }
  }, [activeMobileIndex, displayPapers.length, activeNav, hasMore, isFetchingMore, onLoadMore]);

  const handleShare = (paper: Paper) => {
    navigator.clipboard?.writeText(paper.pdfUrl || window.location.href);
    setShareToast(`Copied DOI link: ${paper.methodology?.doi || paper.id}`);
    setTimeout(() => setShareToast(null), 2500);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      setActiveNav('feed');
      onSearch(searchQuery.trim());
      streamRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-surface-base text-text-primary h-screen w-screen overflow-hidden flex flex-col font-body-md select-none antialiased relative">
      {/* Toast Notification */}
      {shareToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-surface-raised border border-primary/40 text-primary text-label-sm font-label-sm shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          <span>{shareToast}</span>
        </div>
      )}

      {/* ========================================== */}
      {/* TOP APP BAR: Compact Collapsible Search & Filter Rail */}
      {/* ========================================== */}
      <header className="flex-none z-30 bg-surface-base/95 backdrop-blur-md px-space-md pt-2 pb-2 border-b border-surface-border/40">
        {/* Top Row: Logo & Search Expand Action */}
        <div className="flex items-center justify-between gap-2.5 w-full min-h-[44px]">
          {isSearchExpanded ? (
            /* Expanded Search Bar */
            <div className="flex items-center gap-2 w-full animate-in fade-in slide-in-from-top-1 duration-150">
              <form
                onSubmit={handleSearchSubmit}
                className="flex-1 relative flex items-center bg-surface-raised border border-primary rounded-full h-11 px-2.5 shadow-sm transition-colors focus-within:ring-1 focus-within:ring-primary"
              >
                <button
                  type="submit"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-primary transition-colors cursor-pointer"
                  title="Search preprints"
                  aria-label="Submit search"
                >
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </button>

                <input
                  autoFocus
                  className="w-full bg-transparent border-none p-0 text-text-primary font-label-lg text-label-lg focus:outline-none focus:ring-0 placeholder:text-text-muted"
                  placeholder="Search preprints..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                <div className="flex items-center gap-1.5 ml-1.5 shrink-0">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="w-6 h-6 rounded-full hover:bg-surface-container flex items-center justify-center text-text-muted hover:text-text-primary cursor-pointer"
                      title="Clear query"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-2.5 py-1 rounded-full bg-primary text-on-primary font-semibold text-label-sm flex items-center gap-1 active:scale-95 transition-transform cursor-pointer shadow-xs disabled:opacity-50"
                    title="Search"
                  >
                    {isSearching ? (
                      <span className="w-3.5 h-3.5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <span>Search</span>
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Close / Collapse Search Button */}
              <button
                type="button"
                onClick={() => setIsSearchExpanded(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-raised border border-surface-border text-text-muted hover:text-text-primary active:scale-95 transition-all cursor-pointer shrink-0"
                title="Collapse search"
                aria-label="Collapse search"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>

              {/* Settings Button */}
              <button
                onClick={onOpenSettings}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-raised border border-surface-border text-text-secondary hover:text-text-primary active:scale-95 transition-all relative cursor-pointer shrink-0"
                title="Recommendation Settings"
              >
                <span className="material-symbols-outlined text-[20px]">tune</span>
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-arxiv-red"></span>
              </button>
            </div>
          ) : (
            /* Collapsed State: Logo + Brand on left, Search expand & Settings buttons on right */
            <>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm tracking-wider shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">science</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-headline-sm font-bold text-text-primary tracking-tight text-[17px]">
                      PaperFeed
                    </span>                   
                  </div>
                  {searchQuery && (
                    <span className="text-[11px] text-text-muted truncate max-w-[180px]">
                      Query: <span className="text-primary font-medium">{searchQuery.replace(/^"|"$/g, '')}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Trailing Actions: Search Expand Button & Settings Button */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSearchExpanded(true)}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-raised border border-surface-border text-text-secondary hover:text-text-primary hover:border-primary/40 active:scale-95 transition-all cursor-pointer shadow-xs"
                  title="Search preprints"
                  aria-label="Expand search"
                >
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </button>

                <button
                  onClick={onOpenSettings}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-raised border border-surface-border text-text-secondary hover:text-text-primary active:scale-95 transition-all relative cursor-pointer shadow-xs"
                  title="Recommendation Settings"
                >
                  <span className="material-symbols-outlined text-[20px]">tune</span>
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-arxiv-red"></span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Bottom Filter Rail (Horizontal Scrollable Chips) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2.5 pb-0.5 -mx-space-md px-space-md">
          {/* Active arXiv Filter Chip */}
          <button
            onClick={() => onFilterToggle('arxiv')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-label-md text-label-md shrink-0 active:scale-95 transition-all cursor-pointer ${
              activeSources.arxiv
                ? 'bg-arxiv-red/15 border border-arxiv-red/50 text-arxiv-red'
                : 'bg-surface-raised border border-surface-border text-text-muted hover:text-text-secondary'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-arxiv-red animate-pulse"></span>
            <span>arXiv</span>
          </button>

          {/* bioRxiv Filter Chip */}
          <button
            onClick={() => onFilterToggle('biorxiv')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-label-md text-label-md shrink-0 active:scale-95 transition-all cursor-pointer ${
              activeSources.biorxiv
                ? 'bg-biorxiv-blue/20 border border-biorxiv-blue text-biorxiv-blue font-semibold'
                : 'bg-surface-raised border border-biorxiv-blue/40 text-biorxiv-blue hover:bg-biorxiv-blue/10'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-biorxiv-blue"></span>
            <span>bioRxiv</span>
          </button>

          {/* chemRxiv Filter Chip */}
          <button
            onClick={() => onFilterToggle('chemrxiv')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-label-md text-label-md shrink-0 active:scale-95 transition-all cursor-pointer ${
              activeSources.chemrxiv
                ? 'bg-chemrxiv-amber/20 border border-chemrxiv-amber text-chemrxiv-amber font-semibold'
                : 'bg-surface-raised border border-chemrxiv-amber/40 text-chemrxiv-amber hover:bg-chemrxiv-amber/10'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-chemrxiv-amber"></span>
            <span>chemRxiv</span>
          </button>

          {/* Vertical Divider - visible only in landscape orientation */}
          <div className="hidden landscape:block w-[1px] h-5 bg-surface-border shrink-0 my-auto"></div>

          {/* TimeRange Filter Segment - visible only in landscape orientation */}
          <div className="hidden landscape:flex items-center bg-surface-raised border border-surface-border rounded-full p-0.5 shrink-0 text-label-sm font-label-sm">
            <button
              type="button"
              onClick={() => handleTimeRangeSelect('this month')}
              className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                activeTimeRange === 'this month'
                  ? 'bg-primary text-on-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handleTimeRangeSelect('this year')}
              className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                activeTimeRange === 'this year'
                  ? 'bg-primary text-on-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              This Year
            </button>
            <button
              type="button"
              onClick={() => handleTimeRangeSelect('all time')}
              className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                activeTimeRange === 'all time'
                  ? 'bg-primary text-on-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              All Time
            </button>
          </div>

        </div>
      </header>

      {/* ========================================== */}
      {/* MAIN CARD STREAM: Vertical Snap Container   */}
      {/* ========================================== */}
      <main
        className="flex-1 w-full overflow-y-auto snap-y-mandatory no-scrollbar relative px-space-sm pb-20"
        id="paperStream"
        ref={streamRef}
        onScroll={handleScroll}
      >
        {/* EMPTY STATE */}
        {displayPapers.length === 0 && (
          <div className="w-full h-[calc(100dvh-176px)] flex flex-col items-center justify-center gap-2 text-center text-text-muted px-space-md">
            <span className="material-symbols-outlined text-[36px]">
              {activeNav === 'library' ? 'bookmark' : 'search_off'}
            </span>
            <p className="font-body-md text-body-md">
              {activeNav === 'library'
                ? 'Your library is empty. Save papers to see them here.'
                : 'No papers match your search and filters.'}
            </p>
          </div>
        )}

        {/* DYNAMIC PAPER FEED: one snap card per paper */}
        {displayPapers.map((paper, index) => {
          const paperLiked = isLiked(paper.id);
          const paperSaved = isSaved(paper.id);
          const matchPct = calculateMatchPercentage(paper, savedPapers);

          return (
            <PaperCard
              key={paper.id}
              paper={paper}
              index={index}
              isLiked={paperLiked}
              isSaved={paperSaved}
              savedPapersCount={savedPapers.length}
              matchPercentage={matchPct}
              mode="mobile"
              onLikeToggle={onLikeToggle}
              onSaveToggle={onSaveToggle}
              onOpenCite={onOpenCite}
              onShare={handleShare}
            />
          );
        })}

        {isFetchingMore && activeNav === 'feed' && (
          <div className="w-full py-4 flex items-center justify-center gap-2 text-text-muted text-label-sm font-label-sm animate-pulse">
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
            <span>Loading more preprints...</span>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* FLOATING FEED NAVIGATION DOCK (Prev/Next Stream Controls) */}
      {/* Anchored safely on the right margin well above the bottom card action bar (Save/Like buttons) */}
      {/* ======================================================== */}
      <aside className="fixed right-2.5 bottom-40 z-40 flex flex-col gap-1 pointer-events-none">
        <div className="pointer-events-auto flex flex-col bg-surface-overlay/90 backdrop-blur-md p-0.5 rounded-full border border-surface-border shadow-xl">
          {/* Scroll Up Button */}
          <button
            aria-label="Previous Paper"
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary active:bg-surface-raised active:scale-90 transition-all cursor-pointer"
            onClick={scrollToPrevCard}
            title="Previous Paper"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
          </button>
          {/* Scroll Down Button */}
          <button
            aria-label="Next Paper"
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary active:bg-surface-raised active:scale-90 transition-all border-t border-surface-border-subtle cursor-pointer"
            onClick={scrollToNextCard}
            title="Next Paper"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
          </button>
        </div>
      </aside>

      {/* ========================================== */}
      {/* BOTTOM NAVIGATION BAR (Shared Component)    */}
      {/* ========================================== */}
      <nav className="flex-none fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 md:hidden px-space-sm pb-safe bg-surface-raised/95 dark:bg-surface-raised/95 backdrop-blur-lg border-t border-surface-border shadow-lg">
        {/* Item 1: Feed (Active) */}
        <a
          className={`flex flex-col items-center justify-center font-medium py-1 px-3 active:scale-95 transition-transform duration-100 cursor-pointer ${
            activeNav === 'feed' ? 'text-primary' : 'text-text-muted hover:text-text-primary'
          }`}
          href="#feed"
          onClick={(e) => {
            e.preventDefault();
            setActiveNav('feed');
          }}
        >
          <span className="material-symbols-outlined text-[22px]" data-icon="dynamic_feed">
            dynamic_feed
          </span>
          <span className="font-label-sm text-label-sm mt-0.5">Feed</span>
        </a>

        {/* Item 2: My Library */}
        <a
          className={`flex flex-col items-center justify-center py-1 px-3 active:scale-95 transition-transform duration-100 relative cursor-pointer ${
            activeNav === 'library' ? 'text-primary' : 'text-text-muted hover:text-text-primary'
          }`}
          href="#library"
          onClick={(e) => {
            e.preventDefault();
            setActiveNav('library');
          }}
        >
          <span className="material-symbols-outlined text-[22px]" data-icon="bookmark">
            bookmark
          </span>
          <span className="font-label-sm text-label-sm mt-0.5">My Library ({savedPapers.length})</span>
        </a>

        {/* Item 3: Settings */}
        <a
          className={`flex flex-col items-center justify-center py-1 px-3 active:scale-95 transition-transform duration-100 cursor-pointer ${
            activeNav === 'settings' ? 'text-primary' : 'text-text-muted hover:text-text-primary'
          }`}
          href="#settings"
          onClick={(e) => {
            e.preventDefault();
            setActiveNav('settings');
            onOpenSettings();
          }}
        >
          <span className="material-symbols-outlined text-[22px]" data-icon="settings">
            settings
          </span>
          <span className="font-label-sm text-label-sm mt-0.5">Settings</span>
        </a>
      </nav>
    </div>
  );
};