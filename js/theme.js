// SPDX-License-Identifier: AGPL-3.0-only
// Theme management

const ThemeManager = (() => {
  const THEME_KEY = 'kulpio-theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  const getSystemPreference = () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
  };

  const getSavedTheme = () => {
    return localStorage.getItem(THEME_KEY);
  };

  const getCurrentTheme = () => {
    return getSavedTheme() || getSystemPreference();
  };

  const setTheme = (theme) => {
    const phone = document.querySelector('.phone');
    phone?.classList.remove(DARK, LIGHT);
    phone?.classList.add(theme);
    localStorage.setItem(THEME_KEY, theme);
  };

  const toggleTheme = () => {
    const current = getCurrentTheme();
    const next = current === DARK ? LIGHT : DARK;
    setTheme(next);
  };

  const initialize = () => {
    setTheme(getCurrentTheme());
  };

  return {
    initialize,
    toggleTheme,
    getCurrentTheme,
    setTheme
  };
})();

// Initialize theme on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ThemeManager.initialize());
} else {
  ThemeManager.initialize();
}