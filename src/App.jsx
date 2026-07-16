// src/App.jsx
import React, { Component, createRef } from 'react';
import PaperCard from './components/PaperCard';
import PaperService from './services/PaperService';
import RecommenderEngine from './services/RecommenderEngine';
import CogSettings from './components/Settings';
import './App.css';

export default class App extends Component {
  constructor(props) {
    super(props);
    const storedPapers = localStorage.getItem('savedPapers');
    const initialLibrary = storedPapers ? JSON.parse(storedPapers) : [];

    this.state = {
		activeTab: 'feed', // 'feed' or 'library' 
        papers: [],
        likedPapers: [],
        loading: false,
        loadingMore: false,
        savedPapers: JSON.parse(localStorage.getItem('savedPapers') || '[]'),
        query: '"coupled+cluster"',
        openedPaper: null,
        sources: {
            arxiv: true,
            chemrxiv: true,
            biorxiv: true,
        },
        offset: 0,
		showSettings: false, 
        sortML: true,
        minSimilarity: 30,
    };
    this.feedRef = createRef();
    console.log("[App Lifecycle] Constructor initialized.");
  }

  sourceMetadata = {
    arxiv: { label: 'arXiv' },
    biorxiv: { label: 'bioRxiv' },
    chemrxiv: { label: 'chemRxiv' }
  };

  async componentDidMount() {
    console.log("[App Lifecycle] Component mounted. Hydrating local cache configurations...");
    const cachedLikes = localStorage.getItem('likedPapers');
    const cachedPapers = localStorage.getItem('savedPapers');
    
    if (cachedLikes) {
      const parsedLikes = JSON.parse(cachedLikes);
      console.log(`[Storage Cache] Found ${parsedLikes.length} verified liked papers in localStorage.`);
      this.setState({ likedPapers: parsedLikes }, () => this.loadPapers(this.state.query));
    } else {
      console.log("[Storage Cache] No historical user data found. Initializing fresh canvas.");
      this.loadPapers(this.state.query);
    }
    if (cachedPapers) {
      const parsedPapers = JSON.parse(cachedPapers);
      console.log(`[Storage Cache] Found ${parsedPapers.length} verified saved papers in localStorage.`);
      this.setState({ savedPapers: parsedPapers });
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

	// Do we need better than O(N**2)?
  deduplicatePapers = (papers) => {
    return papers.filter((paper, index, self) =>
  	index === self.findIndex((p) => (
  	  p.id === paper.id
  	))
    );
  };

  loadPapers = async (isNewSearch = false) => {
    if (this.state.activeTab === 'library') return;
    if (isNewSearch) {
      this.setState({ loading: true, activePaper: null, offset: 0, papers: [] });
      console.log("[App State] Loading papers for new search. ");
    } else {
      this.setState({ loadingMore: true });
      console.log("[App State] Loading more papers. ");
    }
    
	const { query, sources, likedPapers, offset, papers, minSimilarity } = this.state;
    const activeSources = Object.keys(sources).filter(key => sources[key]);
    

    let currentOffset = isNewSearch ? 0 : offset;
    let run = 1; 
    const max_rerun = 3; 
    const max_entries = 10;

    console.log("[App State] Fetching from sources. ");
    let fetchedPapers = await PaperService.fetchAllSources(query, activeSources, currentOffset, max_entries);
    if (this.state.sortML) {
        console.log(`%c[App State] Resorting according to embedding model`,"color:skyblue");
        for (const paper of fetchedPapers){
            console.log(`%c[Paper] ${paper.title} ${paper.formattedDate} ${paper.tags}`,"color:green")
        }
        let rerun = true;
        let goodPapersSize = fetchedPapers.length;
        while (rerun) {
            const finalPapers = await RecommenderEngine.rankPapers(fetchedPapers, likedPapers, minSimilarity);    
            if (finalPapers.length < goodPapersSize){
                console.log(`%c[App State] Rerun = [${run}]; Fetching extra ${goodPapersSize - finalPapers.length} due to Recommender excluding papers with match certainty less than ${minSimilarity}%`,"color:skyblue");
                const additionalPapers = await PaperService.fetchAllSources(query, activeSources, currentOffset, goodPapersSize - finalPapers.length);
                fetchedPapers = [...additionalPapers, ...finalPapers];
            } else rerun = false;
            if (run>max_rerun) {
                console.error(`%c[API State] Not enough papers found even after ${max_rerun} repeats. ${fetchedPapers.length}`, "color: red;");
                break;
            }
            run += 1;
            currentOffset += max_entries;
        }
    }

    console.log(`[App State] Old render ${this.state.papers.length}.`);
    fetchedPapers = [...this.state.papers, ...fetchedPapers];
    console.log(`[App State] Prepare to render ${fetchedPapers.length}.`);
    const finalPapers = this.deduplicatePapers(fetchedPapers);
    console.log(`[App State] Will render ${finalPapers.length}.`);
    this.setState({ 
		papers: finalPapers,
		loading: false,
		loadingMore: false,
        offset: currentOffset 
	});
  }

  switchTab = (tab) => {
    if (tab === 'library') {
      const stored = localStorage.getItem('savedPapers');
      this.setState({ 
          activeTab: 'library', 
          savedPapers: stored ? JSON.parse(stored) : [] 
      });
    } else {
      this.setState({ activeTab: 'feed' });
    }
	this.render();
  }

  toggleSettings = () => {
    this.setState(prevState => ({ showSettings: !prevState.showSettings }));
  };

  handleLibraryUpdate = (newLibraryData) => {
    console.log(`[App State] Updating saved papers ${newLibraryData}`);
    this.setState({ savedPapers: newLibraryData });
  }

  handleScroll = (e) => {
    if (this.state.loading || this.state.loadingMore) return;
    
    const { scrollTop, clientHeight, scrollHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight * 2) {
       console.log(`%c[App State] Scroll, loading more papers: ${this.state.papers.length} ${scrollHeight} ${scrollTop} ${clientHeight}`,"color:orange");
      this.loadPapers(false);
    }
  
//    console.log(`%c[App State] Rendering routine updated. Visible cards: ${this.state.papers.length} ${scrollHeight} ${scrollTop} ${clientHeight}`,"color:orange");
  }


  scrollFeed = (direction) => {
    console.log(`%c[App State] Scroll: ${this.feedRef}`,"color:grey");
    if (!this.feedRef.current) return;
    console.log(`[Navigation Action] Moving layout pointer: ${direction}`);
    const cardHeight = window.innerHeight;
    this.feedRef.current.scrollBy({
      top: direction === 'down' ? cardHeight : -cardHeight,
      behavior: 'smooth'
    });
  }

  handleSearch = (e) => {
    e.preventDefault();
    console.log(`[Form Event] Execution trigger invoked. Target parameter: "${this.state.query}"`);
	{Object.keys(this.sourceMetadata).map((key) => { 
       const meta = this.sourceMetadata[key];
	   if ( this.state.sources[key] ) {
    		console.log(`[Form Event] Searching in  "${meta.label}" repository`);
	   } 		
	})}
    if (this.state.query.trim()) {
       this.loadPapers(this.state.query);
       if (this.feedRef.current) this.feedRef.current.scrollTop = 0;
    }
  }

  handleInputChange = (e) => {
    this.setState({ query: e.target.value });
  }

  handleRead = (paper) => {
    console.log(`[User Action] Opening PDF  "${paper.pdfUrl}".`);
    // Check if the screen is wide enough for the split layout (1024px) and repo allows opening pdf in iframe
    if (window.innerWidth >= 1024  && ['arXiv'].includes(paper.source) ) {
      this.setState({ openedPaper: paper });
    } else {
      // On mobile, just open the PDF natively in a new browser tab
      window.open(paper.pdfUrl, '_blank');
    }
  }

  handleSourceToggle = (sourceKey) => {
    console.log(`[User Action] Intercepted Source Toggle. Source: ${this.sourceMetadata[sourceKey].label}`);
    this.setState(prevState => ({
      sources: { ...prevState.sources, [sourceKey]: !prevState.sources[sourceKey] }
    }));
  }

  handleLikeToggle = async (paper, isLiked) => {
    console.log(`[User Action] Intercepted Like Toggle. Paper ID: ${paper.id} | New Status: ${isLiked}`);
    let updatedLikes = [...this.state.likedPapers];

    if (isLiked) {
      if (!updatedLikes.some(p => p.id === paper.id)) {
        if (!paper.embedding) {
          console.log("[User Action] Fetching dynamic vector before adding entry to cache...");
          paper.embedding = await RecommenderEngine.getEmbedding(paper);
        }
        updatedLikes.push(paper);
      }
    } else {
      updatedLikes = updatedLikes.filter(p => p.id !== paper.id);
    }

    console.log(`[Storage Cache] Updating browser localStorage payload size: ${updatedLikes.length} instances.`);
    localStorage.setItem('likedPapers', JSON.stringify(updatedLikes));

    if (this.state.activeTab === 'feed') {
      const reRankedPapers = await RecommenderEngine.rankPapers(this.state.papers, updatedLikes);
      this.setState({ likedPapers: updatedLikes, papers: reRankedPapers });
    } else {
      this.setState({ likedPapers: updatedLikes });
    }
  }

  closeReader = () => {
    this.setState({ openedPaper: null });
  }

  clearLibrary = () => {
    if (window.confirm("Are you sure you want to clear your entire Library? This cannot be undone.")) {
      localStorage.removeItem('savedPapers');
      this.setState({ savedPapers: [] });
      console.log("[Storage Cache] Library cleared.");
    }
  }

  clearLikes = () => {
    if (window.confirm("Are you sure you want to clear your Liked papers history?")) {
      localStorage.removeItem('likedPapers');
      this.setState({ likedPapers: [] });
      console.log("[Storage Cache] Liked history cleared.");
    }
  }
  
  handleSimilarityChange = (e) => {
      const value = parseInt(e.target.value,10);  
      this.setState({ minSimilarity: value });
      console.log(`[App State] Minimum similarity to not exclude paper is set to ${value}`);
  }
  
  toggleViewMode = (mode) => {
    this.setState({ activeTab: mode, activePaper: null });
  }

// Rendering section
  renderNavigation = () => (
    <div className="nav-tabs">
      <button 
        className={`tab-btn ${this.state.activeTab === 'feed' ? 'active' : ''}`}
		onClick={() => this.switchTab('feed')}
      >
        Search Feed
      </button>
      <button 
        className={`tab-btn ${this.state.activeTab === 'library' ? 'active' : ''}`}
        onClick={() => this.switchTab('library')}
      >
        My Library ({this.state.savedPapers.length})
      </button>
    </div>
  );

  renderSearchAndFilters = () => (
    <div className="search-container">
      <form onSubmit={this.handleSearch} className="search-form">
        <input type="text" value={this.state.query} onChange={this.handleInputChange} placeholder="Search keywords..." className="search-input" />
        <button type="submit" className="search-btn">🔍</button>
      </form>

      {this.state.activeTab === 'feed' && (
        <div className="filter-container">
          {/*<span className="row-label">Repositories:</span>*/}
          {Object.keys(this.sourceMetadata).map((key) => (
            
            <label key={key} className="filter-label">
              <input type="checkbox" checked={this.state.sources[key]} data-source={key} onChange={() => this.handleSourceToggle(key)} className="hidden-checkbox" />
              <div className="filter-pill">{this.sourceMetadata[key].label}</div>
            </label>
          ))}
        </div>
      )}
    </div>
  );

  renderSettingsMenu = () => (
     <CogSettings
       isOpen={this.state.showSettings}
       onToggle={this.toggleSettings}
       minSimilarity={this.state.minSimilarity}
       onSimilarityChange={this.handleSimilarityChange}
       onClearLibrary={this.clearLibrary}
       onClearLiked={this.clearLikes}
     />
  );

  renderContent = () => {
    const { loading, papers, savedPapers, activeTab, likedPapers, loadingMore } = this.state;
    const displayPapers = activeTab === 'feed' ? papers : savedPapers;
    if (activeTab == 'feed') {
		console.log(`[App State] Rendering repository papers ${displayPapers.length}`);
	} else {
		console.log(`[App State] Rendering saved papers ${displayPapers.length}`);
	}

    if (loading) return <div className="loading-screen"><h2>Loading personalized feed...</h2></div>;
    if (displayPapers.length === 0) {
		if (activeTab == "feed" ) { 
			return <div className="loading-screen"><h2>No papers found.</h2></div>;
		} else {
			return <div className="loading-screen"><h2>No saved papers found.</h2></div>;
		}
    }
    return (
      <>
        {displayPapers.map((paper) => (
          <PaperCard 
            key={`${paper.id}-${activeTab}`} 
            paper={paper} 
            initialIsLiked={likedPapers.some(p => p.id === paper.id)} 
            isInitiallySaved={savedPapers.some(p => p.id === paper.id)} 
            onLikeToggle={this.handleLikeToggle} 
            onLibraryChange={this.handleLibraryUpdate} 
            onRead={this.handleRead} 
          />
        ))}
        {loadingMore && activeTab === 'feed' && <div className="infinite-loader"><div className="spinner small-spinner"></div> Loading more...</div>}
      </>
    );
  };

  renderPdfViewer = () => (
    <div className="viewer-section animate-slide-in">
      <div className="viewer-header">
        <h3>Reading: {this.state.openedPaper.title.substring(0, 40)}...</h3>
        <button className="close-btn" onClick={this.closeReader}>✖ Close</button>
      </div>
      <iframe src={this.state.openedPaper.pdfUrl} title="PDF Reader" className="pdf-frame" />
    </div>
  );

  render() {
    const { openedPaper, activeTab } = this.state;
    const feedModeClass = openedPaper ? "feed-section compressed" : "feed-section centered";

    return (
      <div className="app-container">
        {this.renderNavigation()}
        {this.renderSettingsMenu()}
        <div className="nav-controls">
          <button className="nav-btn" onClick={() => this.scrollFeed('up')}>▲</button>
          <button className="nav-btn" onClick={() => this.scrollFeed('down')}>▼</button>
        </div>
        <div className={feedModeClass}>
          {this.renderSearchAndFilters()}
          
          <div id="feed" ref={this.feedRef} onScroll={this.handleScroll}>
            {this.renderContent()}
          </div>
        </div>
        {openedPaper && this.renderPdfViewer()}
      </div>
    );
  };

}
