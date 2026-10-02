/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import Paper from './models/Paper';
import PaperService from './services/PaperService';
import RecommenderEngine from './services/RecommenderEngine';
import { MobileScreen } from './components/MobileScreen';
import { DesktopScreen } from './components/DesktopScreen';
import { CiteModal } from './components/Modals';
import { CogSettings } from './components/Settings';
import { AppTheme, getStoredTheme, applyTheme } from './utils/theme';
import { TimeRange } from './utils/timeRange';

export type ScreenType = 'mobile' | 'desktop';
export type TransitionType = 'push' | 'push_back' | 'none';

export default function App() {
  console.log("[App Lifecycle] Constructor initialized.");

  const [currentScreen, setCurrentScreen] = useState<ScreenType>(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'mobile';
    }
    return 'desktop';
  });
  const [transitionType, setTransitionType] = useState<TransitionType | null>(null);

  // Theme state: defaults to 'system' (browser preference)
  const [theme, setTheme] = useState<AppTheme>(() => getStoredTheme());

  // TimeRange filter state: 'this month' | 'this year' | 'all time'
  const [timeRange, setTimeRange] = useState<TimeRange>('all time');

  // Paper and Recommender state 
  const [papers, setPapers] = useState<Paper[]>([]);
  const [likedPapers, setLikedPapers] = useState<Paper[]>([]);
  const [savedPapers, setSavedPapers] = useState<Paper[]>([]);
  const [openedPaper, setOpenedPaper] = useState<Paper | null>(null);
  const [activeSources, setActiveSources] = useState<Record<string, boolean>>({
    arxiv: true,
    biorxiv: true,
    chemrxiv: true,
  });
  const [minSimilarity, setMinSimilarity] = useState<number>(30);
  const [searchQuery, setSearchQuery] = useState<string>('"coupled+cluster"');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'library'>('feed');

  // Modals state
  const [citePaper, setCitePaper] = useState<Paper | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const sourceMetadata: Record<string, { label: string }> = {
    arxiv: { label: 'arXiv' },
    biorxiv: { label: 'bioRxiv' },
    chemrxiv: { label: 'chemRxiv' },
  };

  // Hydrate local cache on mount
  useEffect(() => {
    console.log("[App Lifecycle] Component mounted. Hydrating local cache configurations...");
    try {
      const storedLikes = localStorage.getItem('likedPapers');
      if (storedLikes) {
        const parsedLikes = JSON.parse(storedLikes);
        console.log(`[Storage Cache] Found ${parsedLikes.length} verified liked papers in localStorage.`);
        setLikedPapers(parsedLikes.map((p: any) => new Paper(p)));
      } else {
        console.log("[Storage Cache] No historical user data found. Initializing fresh canvas.");
      }

      const storedSaved = localStorage.getItem('savedPapers');
      if (storedSaved) {
        const parsedPapers = JSON.parse(storedSaved);
        console.log(`[Storage Cache] Found ${parsedPapers.length} verified saved papers in localStorage.`);
        setSavedPapers(parsedPapers.map((p: any) => new Paper(p)));
      }
    } catch (e) {
      console.error('[Storage Cache] Error hydrating localStorage:', e);
    }
  }, []);

  // Fetch papers from API sources
  const loadPapers = useCallback(
    async (query: string, sources = activeSources, isNewSearch = true) => {
      if (isNewSearch) {
        console.log("[App State] Loading papers for new search. ");
        setHasMore(true);
      } else {
        console.log("[App State] Loading more papers. ");
      }

      const activeKeys = Object.keys(sources).filter((k) => sources[k]);
      if (activeKeys.length === 0) return;

      console.log("[App State] Fetching from sources. ");
      try {
        setIsSearching(true);
        const fetched = await PaperService.fetchAllSources(query, activeKeys, 0, 10);
        console.log(`[App State] Prepare to render ${fetched.length}.`);

        let finalPapers = fetched;
        if (likedPapers.length > 0 && fetched.length > 0) {
          console.log(`%c[App State] Resorting according to embedding model`, "color:skyblue");
          const ranked = await RecommenderEngine.rankPapers(
            fetched,
            likedPapers,
            minSimilarity
          );
          if (ranked && ranked.length > 0) {
            finalPapers = ranked;
          }
        }

        finalPapers.forEach((paper) => {
          console.log(`%c[Paper] ${paper.title} ${paper.formattedDate} ${paper.tags}`, "color:green");
        });

        console.log(`[App State] Old render ${papers.length}.`);
        console.log(`[App State] Will render ${finalPapers.length}.`);

        setPapers(finalPapers);
      } catch (err) {
        console.error(`%c[API State] Not enough papers found even after repeats. 0`, "color: red;");
      } finally {
        setIsSearching(false);
      }
    },
    [activeSources, likedPapers, minSimilarity, papers.length]
  );

  // Load more papers (infinite scroll / prefetch triggered at N-2)
  const handleLoadMore = useCallback(async () => {
    if (isSearching || isFetchingMore || !hasMore) {
      return;
    }

    const activeKeys = Object.keys(activeSources).filter((k) => activeSources[k]);
    if (activeKeys.length === 0) return;

    try {
      setIsFetchingMore(true);
      const currentOffset = papers.length;
      console.log(`[App State] Fetching next batch of papers (offset: ${currentOffset})...`);
      const fetched = await PaperService.fetchAllSources(searchQuery, activeKeys, currentOffset, 10);

      if (!fetched || fetched.length === 0) {
        setHasMore(false);
        return;
      }

      // Deduplicate against already loaded papers
      const newBatch = fetched.filter(
        (newP) => !papers.some((existingP) => existingP.id === newP.id)
      );

      if (newBatch.length === 0) {
        setHasMore(false);
        return;
      }

      // Keep the ordering of the original batch but sort new batch based on cosine similarity value if there are saved papers
      let batchToAppend = newBatch;
      if (savedPapers.length > 0) {
        console.log(
          `[App State] Sorting incoming batch (${newBatch.length} papers) by cosine similarity against ${savedPapers.length} saved papers.`
        );
        batchToAppend = await RecommenderEngine.sortPapersBySaved(newBatch, savedPapers);
      } else if (likedPapers.length > 0) {
        batchToAppend = await RecommenderEngine.rankPapers(newBatch, likedPapers, minSimilarity);
      }

      // Append to feed, strictly keeping original batch ordering
      setPapers((prev) => {
        const uniqueNew = batchToAppend.filter((b) => !prev.some((p) => p.id === b.id));
        return [...prev, ...uniqueNew];
      });
    } catch (err) {
      console.error('[API State] Error fetching additional papers:', err);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isSearching, isFetchingMore, hasMore, activeSources, papers, searchQuery, savedPapers, likedPapers, minSimilarity]);

  // Initial load
  useEffect(() => {
    loadPapers(searchQuery, activeSources, true);
  }, []);

  // Log rendering routine
  useEffect(() => {
    const displayPapers = activeTab === 'feed' ? papers : savedPapers;
    if (activeTab === 'feed') {
      console.log(`[App State] Rendering repository papers ${displayPapers.length}`);
    } else {
      console.log(`[App State] Rendering saved papers ${displayPapers.length}`);
    }
  }, [papers, savedPapers, activeTab]);

  // Handle Like Toggle with Recommender Re-ranking 
  const handleLikeToggle = async (paper: Paper, isLiked: boolean) => {
    console.log(`[User Action] Intercepted Like Toggle. Paper ID: ${paper.id} | New Status: ${isLiked}`);
    console.log(`[User Action] Liked paper: ${paper.id}`);

    let updatedLikes = [...likedPapers];
    if (isLiked) {
      if (!updatedLikes.some((p) => p.id === paper.id)) {
        if (!paper.embedding) {
          console.log("[User Action] Fetching dynamic vector before adding entry to cache...");
          paper.embedding = await RecommenderEngine.getEmbedding(paper);
        }
        updatedLikes.push(paper);
      }
    } else {
      updatedLikes = updatedLikes.filter((p) => p.id !== paper.id);
    }

    setLikedPapers(updatedLikes);
    console.log(`[Storage Cache] Updating browser localStorage payload size: ${updatedLikes.length} instances.`);
    try {
      localStorage.setItem('likedPapers', JSON.stringify(updatedLikes));
    } catch (err) {
      console.warn('localStorage setItem failed:', err);
    }

    // Re-rank feed if user likes/unlikes
    if (activeTab === 'feed') {
      const reRanked = await RecommenderEngine.rankPapers(
        papers,
        updatedLikes,
        minSimilarity
      );
      setPapers(reRanked);
    }
  };

  // Handle Save Toggle 
  const handleSaveToggle = (paper: Paper) => {
    console.log(`[User Action] Saving paper: ${paper.id}`);
    let updatedLibrary: Paper[];
    const alreadySaved = savedPapers.some((p) => p.id === paper.id);

    if (alreadySaved) {
      console.log(`[App state] Paper is saved, removing it`);
      updatedLibrary = savedPapers.filter((p) => p.id !== paper.id);
    } else {
      updatedLibrary = [paper, ...savedPapers];
    }

    setSavedPapers(updatedLibrary);
    console.log(`[App State] Updating saved papers ${JSON.stringify(updatedLibrary).length} bytes`);
    try {
      localStorage.setItem('savedPapers', JSON.stringify(updatedLibrary));
    } catch (err) {
      console.warn('localStorage setItem failed:', err);
    }
  };

  // Clear library and likes
  const handleClearLibrary = () => {
    localStorage.removeItem('savedPapers');
    setSavedPapers([]);
    console.log("[Storage Cache] Library cleared.");
  };

  const handleClearLikes = () => {
    localStorage.removeItem('likedPapers');
    setLikedPapers([]);
    console.log("[Storage Cache] Liked history cleared.");
    loadPapers(searchQuery, activeSources, true);
  };

  // Source toggle
  const handleFilterToggle = (sourceKey: string) => {
    const label = sourceMetadata[sourceKey]?.label || sourceKey;
    console.log(`[User Action] Intercepted Source Toggle. Source: ${label}`);
    const updated = {
      ...activeSources,
      [sourceKey]: !activeSources[sourceKey],
    };
    setActiveSources(updated);
    loadPapers(searchQuery, updated, true);
  };

  // Search execution
  const handleSearch = (query: string) => {
    console.log(`[Form Event] Execution trigger invoked. Target parameter: "${query}"`);
    Object.keys(activeSources).forEach((key) => {
      const meta = sourceMetadata[key];
      if (activeSources[key] && meta) {
        console.log(`[Form Event] Searching in  "${meta.label}" repository`);
      }
    });

    setSearchQuery(query);
    loadPapers(query, activeSources, true);
  };

  // Navigation handlers per Prototype Navigation Spec
  const handleNavigateToDesktop = (transition: 'push', paper?: Paper) => {
    setTransitionType(transition);
    if (paper) {
      console.log(`[User Action] Opening PDF  "${paper.pdfUrl}".`);
      setOpenedPaper(paper);
    }
    setCurrentScreen('desktop');
  };

  const handleNavigateToMobile = (transition: 'push_back' | 'none') => {
    setTransitionType(transition);
    setCurrentScreen('mobile');
  };

  const handleScrollFeed = (direction: 'up' | 'down') => {
    console.log(`%c[App State] Scroll: [paperStream]`, "color:grey");
    console.log(`[Navigation Action] Moving layout pointer: ${direction}`);
  };

  // Motion animation variants based on transition type
  const variants: Variants = {
    initial: (type: TransitionType | null) => {
      if (type === 'push') {
        return { x: '100%', opacity: 0.95 };
      }
      if (type === 'push_back') {
        return { x: '-100%', opacity: 0.95 };
      }
      return { x: 0, opacity: 1 };
    },
    animate: (type: TransitionType | null) => ({
      x: 0,
      opacity: 1,
      transition: {
        x: {
          duration: type === 'none' ? 0 : 0.35,
          ease: 'easeOut',
        },
        opacity: { duration: type === 'none' ? 0 : 0.2 },
      },
    }),
    exit: (type: TransitionType | null) => {
      if (type === 'push') {
        return { x: '-100%', opacity: 0.95 };
      }
      if (type === 'push_back') {
        return { x: '100%', opacity: 0.95 };
      }
      return { x: 0, opacity: 1 };
    },
  };

  // Recommender & Settings Modal 
  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    try {
      localStorage.setItem('appTheme', newTheme);
    } catch (e) {
      console.error('Failed to save theme to localStorage:', e);
    }
    applyTheme(newTheme);
  };

  useEffect(() => {
    applyTheme(theme);

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleMediaChange = () => {
        if (theme === 'system') {
          applyTheme('system');
        }
      };

      mediaQuery.addEventListener('change', handleMediaChange);
      return () => mediaQuery.removeEventListener('change', handleMediaChange);
    }
  }, [theme]);

  return (
    <div className="min-h-screen bg-surface-base text-text-primary overflow-x-hidden relative">
      <AnimatePresence mode="wait" custom={transitionType}>
        {currentScreen === 'mobile' ? (
          <motion.div
            key="screen-mobile"
            custom={transitionType}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full h-full min-h-screen"
          >
            <MobileScreen
              papers={papers}
              likedPapers={likedPapers}
              savedPapers={savedPapers}
              onNavigateToDesktop={handleNavigateToDesktop}
              onOpenCite={(p) => setCitePaper(p)}
              onLikeToggle={handleLikeToggle}
              onSaveToggle={handleSaveToggle}
              onSearch={handleSearch}
              searchQuery={searchQuery}
              isSearching={isSearching}
              onFilterToggle={handleFilterToggle}
              activeSources={activeSources}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onScrollDirection={handleScrollFeed}
              theme={theme}
              onThemeChange={handleThemeChange}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              onLoadMore={handleLoadMore}
              isFetchingMore={isFetchingMore}
              hasMore={hasMore}
            />
          </motion.div>
        ) : (
          <motion.div
            key="screen-desktop"
            custom={transitionType}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full h-full min-h-screen"
          >
            <DesktopScreen
              papers={papers}
              likedPapers={likedPapers}
              savedPapers={savedPapers}
              openedPaper={openedPaper}
              onCloseReader={() => setOpenedPaper(null)}
              onNavigateToMobile={handleNavigateToMobile}
              onOpenCite={(p) => setCitePaper(p)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onLikeToggle={handleLikeToggle}
              onSaveToggle={handleSaveToggle}
              onSearch={handleSearch}
              searchQuery={searchQuery}
              isSearching={isSearching}
              onFilterToggle={handleFilterToggle}
              activeSources={activeSources}
              onScrollDirection={handleScrollFeed}
              theme={theme}
              onThemeChange={handleThemeChange}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              onLoadMore={handleLoadMore}
              isFetchingMore={isFetchingMore}
              hasMore={hasMore}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cite Modal */}
      <CiteModal paper={citePaper} onClose={() => setCitePaper(null)} />

      {/* Recommender & Settings Modal */}
      <CogSettings
        isOpen={isSettingsOpen}
        onToggle={() => setIsSettingsOpen(!isSettingsOpen)}
        minSimilarity={minSimilarity}
        onSimilarityChange={(val) => {
          console.log(`[App State] Minimum similarity to not exclude paper is set to ${val}`);
          setMinSimilarity(val);
          if (likedPapers.length > 0) {
            RecommenderEngine.rankPapers(papers, likedPapers, val).then((ranked) => {
              setPapers(ranked);
            });
          }
        }}
        onClearLibrary={handleClearLibrary}
        onClearLiked={handleClearLikes}
        likedPapersCount={likedPapers.length}
        savedPapersCount={savedPapers.length}
        theme={theme}
        onThemeChange={handleThemeChange}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />
    </div>
  );
}
