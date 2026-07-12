import './Settings.css';
import React from 'react';

const IconCog = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    <path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33
             1.65 1.65 0 0 0-1 1.51V19a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 17.4a1.65 1.65 0 0 0-1.82.33l-.06.06
             a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 13a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9
             a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3
             a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06
             A1.65 1.65 0 0 0 19.4 9c.13.47.43.88.83 1.13.32.2.69.31 1.07.31H22a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.56z" />
  </svg>
);

const IconClose = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const CogSettings = ({
  isOpen,
  onToggle,
  minSimilarity,
  onSimilarityChange,
  onClearLibrary,
  onClearLiked,
}) => {
  const sliderStyle = { '--slider-fill': `${minSimilarity}%` };

  return (
    <div className="cog-wrapper">
      <button
        className="cog-trigger"
        onClick={onToggle}
        aria-label={isOpen ? 'Close settings' : 'Open settings'}
        aria-expanded={isOpen}
      >
        {isOpen ? <IconClose /> : <IconCog />}
      </button>

      {isOpen && (
        <div className="cog-settings" role="dialog" aria-label="Library settings">

          <div className="settings-slider-group">
            <label className="settings-slider-label" htmlFor="min-similarity">
              <span className="settings-slider-label__key">Min. Similarity:</span>
              <span className="settings-slider-label__value">{minSimilarity}%</span>
            </label>

            <div className="settings-slider-track">
              <input
                id="min-similarity"
                type="range"
                className="settings-slider"
                min={0}
                max={100}
                step={1}
                value={minSimilarity}
                onChange={onSimilarityChange}
                style={sliderStyle}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={minSimilarity}
              />
            </div>

          </div>

          <hr className="settings-divider" />

          <div className="settings-actions">
            <button className="settings-btn settings-btn--liked" onClick={onClearLiked}>
              Clear Liked
            </button>
            <button className="settings-btn settings-btn--saved" onClick={onClearLibrary}>
              Clear Library
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default CogSettings;
