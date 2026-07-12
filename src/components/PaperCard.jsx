import './PaperCard.css'
import React, { useState } from 'react';
/* ── SVG Icons ──────────────────────────────────────────────── */
const IconBook = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const IconHeart = ({ filled }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true"
    style={{ fill: filled ? 'currentColor' : 'none', flexShrink: 0 }}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06
             a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78
             1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const IconBookmark = ({ filled }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true"
    style={{ fill: filled ? 'currentColor' : 'none', flexShrink: 0 }}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const PaperCard = ({ paper, onRead, onLibraryChange, isInitiallySaved, onLikeToggle }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(isInitiallySaved || false);

  const toggleLike = () => {
    const newState = !isLiked;
    setIsLiked(newState);
    if (onLikeToggle) onLikeToggle(paper, newState);
    console.log(`[User Action] Liked paper: ${paper.Id}`);
  };

  const toggleSave = async () => {
    setIsSaving(true);

    console.log(`[User Action] Saving paper: ${paper.id}`);
    const stored = localStorage.getItem('savedPapers');
    let library = stored ? JSON.parse(stored) : [];
    const currentlyInLibrary = library.some(p => p.id === paper.id);

    if (currentlyInLibrary) {
      console.log(`[App state] Paper is saved, removing it`);
      library = library.filter(p => p.id !== paper.id);
    } else {
      library = [paper, ...library];
    }

    localStorage.setItem('savedPapers', JSON.stringify(library));
    
    setIsSaved(!currentlyInLibrary);
    if (onLibraryChange) onLibraryChange(library);
    
    setIsSaving(false);
  };

return (
	<article className="card-feed">
      <div className="card-glass">
       <div className="card">


        {/* Title */}
        <h2 className="title">{paper.title}</h2>

        {/* Authors */}
        <p className="authors">{paper.authors}</p>

        <div className="card-header">
          <span className={`mpc-pill source ${paper.source.toLowerCase()}`}>
            {paper.source}
          </span>
          <span className="paper-date">{paper.formattedDate}</span>
        </div>

        {/* Abstract — label + scrollable body */}
        <div className="abstract-section">
          <p className="abstract-label">Abstract</p>
          <p className="abstract">{paper.abstract}</p>
        </div>

        <hr className="divider" />
        {/* Actions */}
        <div className="actions">
          {/* Read */}
          <button
            className={`btn icon-btn`}
            onClick={() => onRead(paper)}
            aria-label="Read paper"
          >
            <IconBook /> 
            <span>Read</span> 
          </button> 

          {/* Like */}
          <button
            className={`btn icon-btn${isLiked ? ' liked' : ''}`}
            onClick={toggleLike}
            aria-label={isLiked ? 'Unlike paper' : 'Like paper'}
            aria-pressed={isLiked}
          >
            <IconHeart filled={isLiked} />
            <span> Like </span>
          </button>

          {/* Save */}
          <button
            className={`btn icon-btn${isSaved ? ' active' : ''}`}
            onClick={toggleSave}
            disabled={isSaving}
            aria-label={isSaved ? 'Remove from library' : 'Save to library'}
            aria-pressed={isSaved}
          >
            {isSaving
              ? <span className="spinner" aria-label="Saving…" />
              : <IconBookmark filled={isSaved} />
            }
            <span> Save </span>
          </button>

        </div>
       </div>
      </div>
    </article>
);
};

export default PaperCard;
