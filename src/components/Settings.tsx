import React from 'react';
import { AppTheme, getSystemTheme } from '../utils/theme';
import { TimeRange } from '../utils/timeRange';

interface CogSettingsProps {
  isOpen: boolean;
  onToggle: () => void;
  minSimilarity: number;
  onSimilarityChange: (value: number) => void;
  onClearLibrary: () => void;
  onClearLiked: () => void;
  likedPapersCount?: number;
  savedPapersCount?: number;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  timeRange?: TimeRange;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
}

export const CogSettings: React.FC<CogSettingsProps> = ({
  isOpen,
  onToggle,
  minSimilarity,
  onSimilarityChange,
  onClearLibrary,
  onClearLiked,
  likedPapersCount = 0,
  savedPapersCount = 0,
  theme,
  onThemeChange,
  timeRange,
  onTimeRangeChange,
}) => {
  if (!isOpen) return null;

  const systemTheme = getSystemTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface-raised border border-surface-border rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </div>
            <div>
              <h3 className="text-headline-sm font-semibold text-text-primary">Settings & Preferences</h3>
              <p className="text-label-sm font-label-sm text-text-muted">Appearance & semantic recommender</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Theme Appearance Controls */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-label-sm font-label-sm text-text-muted uppercase tracking-wider font-semibold">
              Appearance
            </span>
            <span className="text-label-sm font-label-sm text-text-secondary">
              {theme === 'system' ? `Browser (${systemTheme})` : theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* System / Browser Theme Button (Default) */}
            <button
              type="button"
              onClick={() => onThemeChange('system')}
              className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                theme === 'system'
                  ? 'bg-primary/10 border-primary text-primary font-medium shadow-sm'
                  : 'bg-surface-container border-surface-border text-text-secondary hover:text-text-primary hover:border-surface-border-subtle'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">devices</span>
              <span className="text-label-md font-label-md font-semibold">System</span>
              <span className="text-[10px] text-text-muted">Auto ({systemTheme})</span>
            </button>

            {/* Light Theme Button */}
            <button
              type="button"
              onClick={() => onThemeChange('light')}
              className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-primary/10 border-primary text-primary font-medium shadow-sm'
                  : 'bg-surface-container border-surface-border text-text-secondary hover:text-text-primary hover:border-surface-border-subtle'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">light_mode</span>
              <span className="text-label-md font-label-md font-semibold">Light</span>
              <span className="text-[10px] text-text-muted">Paper White</span>
            </button>

            {/* Dark Theme Button */}
            <button
              type="button"
              onClick={() => onThemeChange('dark')}
              className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-primary/10 border-primary text-primary font-medium shadow-sm'
                  : 'bg-surface-container border-surface-border text-text-secondary hover:text-text-primary hover:border-surface-border-subtle'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">dark_mode</span>
              <span className="text-label-md font-label-md font-semibold">Dark</span>
              <span className="text-[10px] text-text-muted">Obsidian</span>
            </button>
          </div>
        </div>

        <div className="h-[1px] bg-surface-border my-0.5"></div>

        {/* Time Range Filter Controls */}
        {timeRange && onTimeRangeChange && (
          <>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-label-sm font-label-sm text-text-muted uppercase tracking-wider font-semibold">
                  Time Range Filter
                </span>
                <span className="text-label-sm font-label-sm text-text-secondary capitalize">
                  {timeRange}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onTimeRangeChange('this month')}
                  className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    timeRange === 'this month'
                      ? 'bg-primary/10 border-primary text-primary font-medium shadow-sm'
                      : 'bg-surface-container border-surface-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                  <span className="text-label-md font-label-md font-semibold">This Month</span>
                </button>

                <button
                  type="button"
                  onClick={() => onTimeRangeChange('this year')}
                  className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    timeRange === 'this year'
                      ? 'bg-primary/10 border-primary text-primary font-medium shadow-sm'
                      : 'bg-surface-container border-surface-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                  <span className="text-label-md font-label-md font-semibold">This Year</span>
                </button>

                <button
                  type="button"
                  onClick={() => onTimeRangeChange('all time')}
                  className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    timeRange === 'all time'
                      ? 'bg-primary/10 border-primary text-primary font-medium shadow-sm'
                      : 'bg-surface-container border-surface-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">history</span>
                  <span className="text-label-md font-label-md font-semibold">All Time</span>
                </button>
              </div>
            </div>

            <div className="h-[1px] bg-surface-border my-0.5"></div>
          </>
        )}

        {/* Recommender Engine Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-label-md font-label-md">
            <span className="text-text-secondary">Min. Similarity Filter</span>
            <span className="text-primary font-mono font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
              {minSimilarity}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minSimilarity}
            onChange={(e) => onSimilarityChange(parseInt(e.target.value, 10))}
            className="w-full accent-primary h-2 bg-surface-container rounded-lg cursor-pointer"
          />
          <p className="text-body-sm text-text-muted">
            Papers with lower cosine similarity than {minSimilarity}% against your liked preprints will be filtered out.
          </p>
        </div>

        <div className="h-[1px] bg-surface-border my-0.5"></div>

        {/* Clear Data Buttons */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-label-sm font-label-sm text-text-muted uppercase tracking-wider font-semibold">
              Local Storage Maintenance
            </span>
            <span className="text-label-sm font-label-sm text-text-secondary">
              {likedPapersCount} liked · {savedPapersCount} saved
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-label-sm font-label-sm">
            <div className="p-2.5 rounded-lg bg-surface-container border border-surface-border flex flex-col items-center">
              <span className="text-text-muted text-[11px] font-medium">Liked History</span>
              <span className="font-bold text-text-primary text-[15px] mt-0.5">
                {likedPapersCount} {likedPapersCount === 1 ? 'paper' : 'papers'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-container border border-surface-border flex flex-col items-center">
              <span className="text-text-muted text-[11px] font-medium">Saved Library</span>
              <span className="font-bold text-text-primary text-[15px] mt-0.5">
                {savedPapersCount} {savedPapersCount === 1 ? 'paper' : 'papers'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onClearLiked}
              className="px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-surface-border text-arxiv-red text-label-md font-label-md font-medium transition-colors cursor-pointer"
            >
              Clear Liked History
            </button>
            <button
              onClick={onClearLibrary}
              className="px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-surface-border text-primary text-label-md font-label-md font-medium transition-colors cursor-pointer"
            >
              Clear Saved Library
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-surface-border">
          <button
            onClick={onToggle}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold text-label-md font-label-md hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            Apply &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CogSettings;
