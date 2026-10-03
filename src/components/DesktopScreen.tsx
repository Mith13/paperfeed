import React, { useEffect, useState, useRef } from 'react';
import Paper from '../models/Paper';
import { AppTheme } from '../utils/theme';
import { PaperCard, calculateMatchPercentage } from './PaperCard';
import { TimeRange, filterPapersByTimeRange } from '../utils/timeRange';
import { AboutModal } from './Modals';

interface DesktopScreenProps {
  papers: Paper[];
  likedPapers: Paper[];
  savedPapers: Paper[];
  openedPaper: Paper | null;
  onCloseReader: () => void;
  onNavigateToMobile: (transition: 'push_back' | 'none') => void;
  onOpenCite: (paper: Paper) => void;
  onOpenSettings: () => void;
  onLikeToggle: (paper: Paper, isLiked: boolean) => void;
  onSaveToggle: (paper: Paper) => void;
  onSearch: (query: string) => void;
  searchQuery?: string;
  isSearching?: boolean;
  onFilterToggle: (source: string) => void;
  activeSources: Record<string, boolean>;
  onScrollDirection?: (dir: 'up' | 'down') => void;
  theme?: AppTheme;
  onThemeChange?: (theme: AppTheme) => void;
  timeRange?: TimeRange;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
  onLoadMore?: () => void;
  isFetchingMore?: boolean;
  hasMore?: boolean;
}

export const DesktopScreen: React.FC<DesktopScreenProps> = ({
  papers,
  likedPapers,
  savedPapers,
  openedPaper,
  onCloseReader,
  onNavigateToMobile,
  onOpenCite,
  onOpenSettings,
  onLikeToggle,
  onSaveToggle,
  onSearch,
  searchQuery: initialSearchQuery,
  isSearching = false,
  onFilterToggle,
  activeSources,
  onScrollDirection,
  theme = 'system',
  onThemeChange,
  timeRange: propTimeRange,
  onTimeRangeChange,
  onLoadMore,
  isFetchingMore = false,
  hasMore = true,
}) => {
  const desktopFeedRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '"coupled+cluster"');
  const [localTimeRange, setLocalTimeRange] = useState<TimeRange>('all time');
  const activeTimeRange = propTimeRange ?? localTimeRange;

  const handleTimeRangeSelect = (tr: TimeRange) => {
    if (onTimeRangeChange) {
      onTimeRangeChange(tr);
    } else {
      setLocalTimeRange(tr);
    }
  };

  const [shareToast, setShareToast] = useState<string | null>(null);
  const [activeSidebarNav, setActiveSidebarNav] = useState<string>('feed');
  const [currentReaderPaper, setCurrentReaderPaper] = useState<Paper | null>(openedPaper);
  const [activeDesktopIndex, setActiveDesktopIndex] = useState<number>(0);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  useEffect(() => {
    if (openedPaper) {
      setCurrentReaderPaper(openedPaper);
    }
  }, [openedPaper]);

  // Reset scroll and index when switching tabs (Feed, Library, Liked)
  useEffect(() => {
    desktopFeedRef.current?.scrollTo({ top: 0 });
    setActiveDesktopIndex(0);
  }, [activeSidebarNav]);

  const isLiked = (paperId: string) => likedPapers.some((p) => p.id === paperId);
  const isSaved = (paperId: string) => savedPapers.some((p) => p.id === paperId);

  const basePapers =
    activeSidebarNav === 'library'
      ? savedPapers
      : activeSidebarNav === 'liked'
      ? likedPapers
      : papers;
  const displayPapers =
    activeSidebarNav === 'feed'
      ? filterPapersByTimeRange(basePapers, activeTimeRange)
      : basePapers;
  const currentPaper = displayPapers[activeDesktopIndex] || displayPapers[0] || papers[0];

  const scrollDesktopFeed = (direction: 'up' | 'down') => {
    onScrollDirection?.(direction);
    if (desktopFeedRef.current) {
      const cardHeight = desktopFeedRef.current.clientHeight;
      desktopFeedRef.current.scrollBy({
        top: direction === 'down' ? cardHeight : -cardHeight,
        behavior: 'smooth',
      });
    }
  };

  const handleDesktopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const cardHeight = container.clientHeight || 600;
    const newIndex = Math.round(container.scrollTop / cardHeight);
    if (newIndex !== activeDesktopIndex && newIndex >= 0 && newIndex < displayPapers.length) {
      setActiveDesktopIndex(newIndex);
    }

    // Trigger loading of new papers when N-2 paper is reached
    if (
      activeSidebarNav === 'feed' &&
      hasMore &&
      !isFetchingMore &&
      displayPapers.length >= 2 &&
      newIndex >= displayPapers.length - 2
    ) {
      onLoadMore?.();
    }
  };

  // Trigger loading when activeDesktopIndex reaches N-2 paper
  useEffect(() => {
    if (
      activeSidebarNav === 'feed' &&
      hasMore &&
      !isFetchingMore &&
      displayPapers.length >= 2 &&
      activeDesktopIndex >= displayPapers.length - 2
    ) {
      onLoadMore?.();
    }
  }, [activeDesktopIndex, displayPapers.length, activeSidebarNav, hasMore, isFetchingMore, onLoadMore]);

  // Keyboard navigation listener (J/K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'j' || e.key === 'ArrowDown') {
        scrollDesktopFeed('down');
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        scrollDesktopFeed('up');
      } else if (e.key === 'l' || e.key === 'L') {
        if (currentPaper) onLikeToggle(currentPaper, !isLiked(currentPaper.id));
      } else if (e.key === 's' || e.key === 'S') {
        if (currentPaper) onSaveToggle(currentPaper);
      } else if (e.key === 'c' || e.key === 'C') {
        if (currentPaper) onOpenCite(currentPaper);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('desktopSearchInput') as HTMLInputElement | null;
        input?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPaper, likedPapers, savedPapers, onOpenCite, onLikeToggle, onSaveToggle]);

  const handleShare = (paper: Paper) => {
    navigator.clipboard?.writeText(paper.pdfUrl || window.location.href);
    setShareToast(`Copied DOI link: ${paper.methodology?.doi || paper.id}`);
    setTimeout(() => setShareToast(null), 2500);
  };

  const scrollToTop = () => {
    if (desktopFeedRef.current) {
      desktopFeedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveDesktopIndex(0);
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      setActiveSidebarNav('feed');
      onSearch(searchQuery.trim());
      setActiveDesktopIndex(0);
      desktopFeedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-surface-base text-text-primary min-h-screen flex flex-col font-body-md antialiased selection:bg-primary-container selection:text-white relative">
      {/* Toast Notification */}
      {shareToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-surface-raised border border-primary/40 text-primary text-label-sm font-label-sm shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          <span>{shareToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP APP BAR                                                            */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 flex items-center justify-between w-full px-space-md md:px-space-lg h-16 bg-surface-base/90 dark:bg-surface-base/90 backdrop-blur-md border-b border-surface-border dark:border-surface-border">
        {/* Brand / Mobile Left Toggle */}
        <div className="flex items-center gap-4">
          {/* Element (xpath: //header//div[contains(@class, 'flex items-center gap-2.5') and .//span[text()='PaperFeed']]) */}
          <div
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity group"
            onClick={() => setIsAboutModalOpen(true)}
            title="About PaperFeed"
          >
            <div className="w-8 h-8 rounded-lg bg-surface-raised border border-surface-border flex items-center justify-center text-primary shadow-inner group-hover:border-primary/50 transition-colors">
              <span className="material-symbols-outlined text-[20px]" data-icon="auto_stories">
                auto_stories
              </span>
            </div>
            <span className="text-headline-sm font-headline-sm font-bold text-text-primary dark:text-text-primary tracking-tight">
              PaperFeed
            </span>
          </div>
        </div>

        {/* Center Search Bar */}
        <div className="flex-1 max-w-xl mx-4 hidden md:block">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            {/* Left Search Icon Button (Clickable!) */}
            <button
              type="submit"
              className="absolute left-2.5 w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-primary transition-colors cursor-pointer"
              title="Search preprints"
              aria-label="Submit search"
            >
              <span
                className="material-symbols-outlined text-[18px]"
                data-icon="search"
              >
                search
              </span>
            </button>

            <input
              id="desktopSearchInput"
              className="w-full h-10 pl-9 pr-32 rounded-full bg-surface-raised border border-surface-border text-body-md font-body-md text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-150 shadow-inner"
              placeholder="Search preprints by title, author, keyword..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="absolute right-1.5 flex items-center gap-1.5">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    const input = document.getElementById('desktopSearchInput');
                    input?.focus();
                  }}
                  className="w-6 h-6 rounded-full hover:bg-surface-container flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  title="Clear query"
                >
                  <span className="material-symbols-outlined text-[14px]" data-icon="close">
                    close
                  </span>
                </button>
              )}

              {/* Explicit Search Action Button with loading spinner */}
              <button
                type="submit"
                disabled={isSearching}
                className="px-3 py-1 rounded-full bg-primary text-on-primary font-medium text-label-sm font-label-sm hover:opacity-90 transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                title="Search preprints"
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
        </div>

        {/* Trailing Actions: Settings */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-lg bg-surface-raised hover:bg-surface-container border border-surface-border flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Recommendation Engine & Settings"
          >
            <span className="material-symbols-outlined text-[19px]" data-icon="tune">
              tune
            </span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN APP SHELL: LEFT SIDEBAR + CENTRAL STREAM + RIGHT DOCK              */}
      {/* ========================================================================= */}
      <div className="flex-1 flex w-full max-w-[1600px] mx-auto relative">
        {/* 2A. LEFT SIDEBAR */}
        <aside className="hidden lg:flex flex-col justify-between w-64 h-[calc(100vh-4rem)] sticky top-16 border-r border-surface-border bg-surface-base p-space-md z-30 select-none">
          <div className="flex flex-col gap-6">
            {/* Primary Navigation Links */}
            {/* Element (xpath: //nav//a[contains(., 'Feed')]) */}
            {/* Navigates to Mobile Screen with none transition */}
            <nav className="flex flex-col gap-1">
              {/* Feed Stream link */}
              <a
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                  activeSidebarNav === 'feed'
                    ? 'bg-surface-raised text-primary border-surface-border'
                    : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary border-transparent'
                }`}
                href="#feed"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveSidebarNav('feed');
                  {/*onNavigateToMobile('none'); */}
                }}
                title="Switch to Mobile View (none transition)"
              >
                <span className="material-symbols-outlined text-[20px]" data-icon="dynamic_feed">
                  dynamic_feed
                </span>
                <span className="text-label-md font-label-md">Search Feed</span>
              </a>

              {/* Library */}
              <a
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 font-medium cursor-pointer ${
                  activeSidebarNav === 'library'
                    ? 'bg-surface-raised text-primary border border-surface-border'
                    : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                }`}
                href="#library"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveSidebarNav('library');
                }}
              >
                <span className="material-symbols-outlined text-[20px]" data-icon="bookmark">
                  bookmark
                </span>
                <span className="text-label-md font-label-md">My Library</span>
                <span className="ml-auto text-label-sm font-label-sm bg-surface-container px-2 py-0.5 rounded text-text-muted">
                  {savedPapers.length}
                </span>
              </a>

              {/* Liked Preprints */}
              <a
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 font-medium cursor-pointer ${
                  activeSidebarNav === 'liked'
                    ? 'bg-surface-raised text-primary border border-surface-border'
                    : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                }`}
                href="#liked"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveSidebarNav('liked');
                }}
              >
                <span className="material-symbols-outlined text-[20px] text-arxiv-red" data-icon="favorite">
                  favorite
                </span>
                <span className="text-label-md font-label-md">Liked Papers</span>
                <span className="ml-auto text-label-sm font-label-sm bg-surface-container px-2 py-0.5 rounded text-text-muted">
                  {likedPapers.length}
                </span>
              </a>

              {/* Settings */}
              <a
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 font-medium cursor-pointer ${
                  activeSidebarNav === 'settings'
                    ? 'bg-surface-raised text-primary border border-surface-border'
                    : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                }`}
                href="#settings"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenSettings();
                }}
              >
                <span className="material-symbols-outlined text-[20px]" data-icon="settings">
                  settings
                </span>
                <span className="text-label-md font-label-md">Settings</span>
              </a>
            </nav>
          </div>
        </aside>

        {/* 2B. CENTRAL FEED CANVAS: EXACTLY ONE CARD DISPLAYED AT A TIME */}
        <main
          className={`flex-1 flex flex-col items-center px-4 md:px-8 py-4 relative overflow-hidden min-h-[calc(100vh-4rem)] ${
            currentReaderPaper ? 'max-w-xl' : ''
          }`}
        >
          {/* Filter Bar Rail */}
          <section className="w-full max-w-2xl mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-base/80 backdrop-blur-md py-1 z-20">
            {/* Repository Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar pb-1 sm:pb-0">
              {/* arXiv Filter */}
              <button
                onClick={() => onFilterToggle('arxiv')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label-md font-label-md font-medium transition-all shadow-sm cursor-pointer ${
                  activeSources.arxiv
                    ? 'bg-arxiv-red/10 border border-arxiv-red/40 text-arxiv-red hover:bg-arxiv-red/20'
                    : 'bg-surface-raised border border-surface-border text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-arxiv-red"></span>
                <span>arXiv</span>
              </button>

              {/* bioRxiv Filter */}
              <button
                onClick={() => onFilterToggle('biorxiv')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label-md font-label-md font-medium transition-all cursor-pointer ${
                  activeSources.biorxiv
                    ? 'bg-biorxiv-blue/20 border border-biorxiv-blue text-biorxiv-blue'
                    : 'bg-biorxiv-blue/10 border border-biorxiv-blue/40 text-biorxiv-blue hover:bg-biorxiv-blue/20'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-biorxiv-blue"></span>
                <span>bioRxiv</span>
              </button>

              {/* chemRxiv Filter */}
              <button
                onClick={() => onFilterToggle('chemrxiv')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label-md font-label-md font-medium transition-all cursor-pointer ${
                  activeSources.chemrxiv
                    ? 'bg-chemrxiv-amber/20 border border-chemrxiv-amber text-chemrxiv-amber'
                    : 'bg-chemrxiv-amber/10 border border-chemrxiv-amber/40 text-chemrxiv-amber hover:bg-chemrxiv-amber/20'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-chemrxiv-amber"></span>
                <span>chemRxiv</span>
              </button>
            </div>

            {/* Secondary Controls: Recency & TimeRange Filter */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <div className="flex items-center bg-surface-raised border border-surface-border rounded-lg p-0.5 text-label-sm font-label-sm text-text-secondary">
                <button
                  onClick={() => handleTimeRangeSelect('this month')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    activeTimeRange === 'this month'
                      ? 'bg-primary text-on-primary font-semibold shadow-xs'
                      : 'hover:text-text-primary'
                  }`}
                  title="Show preprints from this month"
                >
                  This Month
                </button>
                <button
                  onClick={() => handleTimeRangeSelect('this year')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    activeTimeRange === 'this year'
                      ? 'bg-primary text-on-primary font-semibold shadow-xs'
                      : 'hover:text-text-primary'
                  }`}
                  title="Show preprints from this year"
                >
                  This Year
                </button>
                <button
                  onClick={() => handleTimeRangeSelect('all time')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    activeTimeRange === 'all time'
                      ? 'bg-primary text-on-primary font-semibold shadow-xs'
                      : 'hover:text-text-primary'
                  }`}
                  title="Show preprints from all time"
                >
                  All Time
                </button>
              </div>
            </div>
          </section>

          {/* STREAM CONTAINER: STRICT ONE-CARD VIEWPORT SNAP */}
          <div
            id="desktopFeed"
            ref={desktopFeedRef}
            onScroll={handleDesktopScroll}
            className="w-full max-w-2xl h-[calc(100vh-9rem)] overflow-y-auto snap-y-mandatory no-scrollbar relative flex flex-col items-center"
          >
            {/* Empty State */}
            {displayPapers.length === 0 && (
              <div className="w-full h-full min-h-[440px] flex flex-col items-center justify-center gap-3 text-center text-text-muted px-6 my-auto">
                <span className="material-symbols-outlined text-[48px] text-text-muted">
                  {activeSidebarNav === 'library'
                    ? 'bookmark'
                    : activeSidebarNav === 'liked'
                    ? 'favorite'
                    : 'search_off'}
                </span>
                <p className="text-headline-sm font-semibold text-text-primary">
                  {activeSidebarNav === 'library'
                    ? 'Your library is empty'
                    : activeSidebarNav === 'liked'
                    ? 'No liked preprints yet'
                    : `No preprints found for "${searchQuery}"`}
                </p>
                <p className="text-body-sm text-text-secondary max-w-sm">
                  {activeSidebarNav === 'library'
                    ? 'Save papers to your personal library by clicking the bookmark button on any paper card.'
                    : activeSidebarNav === 'liked'
                    ? 'Like papers by clicking the heart button to train your personal recommendation feed.'
                    : 'Try checking your spelling, using broader topics (e.g. quantum, biology, chemistry), or toggling the repository filters above.'}
                </p>
                {activeSidebarNav === 'feed' && (
                  <button
                    onClick={() => {
                      setSearchQuery('quantum');
                      onSearch('quantum');
                    }}
                    className="mt-2 px-4 py-2 rounded-lg bg-surface-raised hover:bg-surface-container border border-surface-border text-label-md font-label-md text-primary font-medium cursor-pointer transition-colors shadow-sm"
                  >
                    Search "quantum"
                  </button>
                )}
              </div>
            )}
            {displayPapers.map((paper, index) => {
              const isPaperLiked = isLiked(paper.id);
              const isPaperSaved = isSaved(paper.id);
              const matchPct = calculateMatchPercentage(paper, likedPapers);

              return (
                <div
                  key={paper.id}
                  className="w-full h-[calc(100vh-9rem)] min-h-[660px] flex-none snap-card snap-always flex items-center justify-center py-2 px-2"
                >
                  <PaperCard
                    paper={paper}
                    index={index}
                    isLiked={isPaperLiked}
                    isSaved={isPaperSaved}
                    savedPapersCount={savedPapers.length}
                    matchPercentage={matchPct}
                    mode="desktop"
                    onLikeToggle={onLikeToggle}
                    onSaveToggle={onSaveToggle}
                    onOpenCite={onOpenCite}
                    onShare={handleShare}
                    onRead={() => setCurrentReaderPaper(paper)}
                  />
                </div>
              );
            })}

            {isFetchingMore && activeSidebarNav === 'feed' && (
              <div className="w-full py-4 flex items-center justify-center gap-2 text-text-muted text-label-sm font-label-sm animate-pulse">
                <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                <span>Loading more preprints...</span>
              </div>
            )}
          </div>

          {/* STREAM NAVIGATION HUD: POSITIONED IN RIGHT GUTTER */}
          <aside className="fixed right-6 lg:right-10 bottom-24 hidden md:flex flex-col items-center gap-3 z-30">
            <div className="flex flex-col items-center bg-surface-raised/95 border border-surface-border rounded-full p-1 backdrop-blur-md shadow-2xl">
              <button
                onClick={() => scrollDesktopFeed('up')}
                className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center text-text-secondary hover:text-text-primary transition-transform active:scale-90 cursor-pointer"
                title="Previous paper (K or Up)"
              >
                <span className="material-symbols-outlined text-[22px]" data-icon="arrow_upward">
                  arrow_upward
                </span>
              </button>
              <div className="w-5 h-[1px] bg-surface-border my-0.5"></div>
              <button
                onClick={() => scrollDesktopFeed('down')}
                className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center text-text-secondary hover:text-text-primary transition-transform active:scale-90 cursor-pointer"
                title="Next paper (J or Down)"
              >
                <span className="material-symbols-outlined text-[22px]" data-icon="arrow_downward">
                  arrow_downward
                </span>
              </button>
            </div>

            {/* Paper Index Counter Pill */}
            <div className="px-3 py-1 rounded-full bg-surface-dim/90 border border-surface-border text-label-sm font-label-sm text-text-secondary shadow-md font-mono">
              {activeDesktopIndex + 1} / {displayPapers.length}
            </div>

            {/* Scroll to Top Indicator */}
            <button
              onClick={scrollToTop}
              className="w-8 h-8 rounded-full bg-surface-dim hover:bg-surface-container border border-surface-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors text-[14px] cursor-pointer"
              title="Reset to Top"
            >
              <span className="material-symbols-outlined text-[16px]" data-icon="vertical_align_top">
                vertical_align_top
              </span>
            </button>
          </aside>
        </main>

        {/* 2C. EMBEDDED PDF VIEWER (arXiv viewer on split view) */}
        {currentReaderPaper && (
          <aside className="hidden lg:flex flex-col w-[540px] xl:w-[680px] h-[calc(100vh-4rem)] sticky top-16 border-l border-surface-border bg-surface-base p-space-md overflow-hidden z-20">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="material-symbols-outlined text-primary text-[20px]">menu_book</span>
                <h3 className="text-body-md font-semibold text-text-primary truncate">
                  Reading: {currentReaderPaper.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={currentReaderPaper.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-surface-container border border-surface-border text-label-sm font-label-sm text-primary hover:bg-surface-container-high transition-colors"
                >
                  Open External ↗
                </a>
                <button
                  onClick={() => {
                    setCurrentReaderPaper(null);
                    onCloseReader();
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  title="Close Reader"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>
            <div className="flex-1 w-full h-full mt-3 rounded-lg overflow-hidden border border-surface-border bg-surface-dim">
              <iframe
                src={currentReaderPaper.pdfUrl}
                title={`PDF Reader - ${currentReaderPaper.title}`}
                className="w-full h-full border-none"
              />
            </div>
          </aside>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. MOBILE BOTTOM NAVIGATION BAR                                           */}
      {/* ========================================================================= */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 md:hidden px-space-sm pb-safe bg-surface-raised/95 dark:bg-surface-raised/95 backdrop-blur-lg border-t border-surface-border dark:border-surface-border shadow-lg">
        {/* Feed (ACTIVE) -> Also matches xpath //nav//a[contains(., 'Feed')] */}
        <a
          className="flex flex-col items-center justify-center text-primary dark:text-primary font-medium active:scale-95 transition-transform duration-100 cursor-pointer"
          href="#feed"
          onClick={(e) => {
            e.preventDefault();
            onNavigateToMobile('none');
          }}
        >
          <span className="material-symbols-outlined text-[22px]" data-icon="dynamic_feed">
            dynamic_feed
          </span>
          <span className="text-label-sm font-label-sm mt-0.5">Search Feed</span>
        </a>

        {/* Library */}
        <a
          className="flex flex-col items-center justify-center text-text-muted dark:text-text-muted hover:text-text-primary dark:hover:text-text-primary active:scale-95 transition-transform duration-100 cursor-pointer"
          href="#library"
          onClick={(e) => {
            e.preventDefault();
            setActiveSidebarNav('library');
          }}
        >
          <span className="material-symbols-outlined text-[22px]" data-icon="bookmark">
            bookmark
          </span>
          <span className="text-label-sm font-label-sm mt-0.5">My Library ({savedPapers.length})</span>
        </a>

        {/* Settings */}
        <a
          className="flex flex-col items-center justify-center text-text-muted dark:text-text-muted hover:text-text-primary dark:hover:text-text-primary active:scale-95 transition-transform duration-100 cursor-pointer"
          href="#settings"
          onClick={(e) => {
            e.preventDefault();
            onOpenSettings();
          }}
        >
          <span className="material-symbols-outlined text-[22px]" data-icon="settings">
            settings
          </span>
          <span className="text-label-sm font-label-sm mt-0.5">Settings</span>
        </a>
      </nav>

      {/* About Application Modal */}
      <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
    </div>
  );
};
