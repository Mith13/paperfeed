export type AppTheme = 'system' | 'dark' | 'light';

export function getStoredTheme(): AppTheme {
  try {
    const saved = localStorage.getItem('appTheme');
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      return saved;
    }
  } catch (e) {
    console.error('Failed to read theme from localStorage', e);
  }
  return 'system'; // Default theme is the browser/system one
}

export function getSystemTheme(): 'dark' | 'light' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

export function applyTheme(theme: AppTheme): 'dark' | 'light' {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
  return resolved;
}
