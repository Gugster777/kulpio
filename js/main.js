// SPDX-License-Identifier: AGPL-3.0-only
// Main application entry point

(function() {
  'use strict';

  // Initialize all modules
  const init = () => {
    console.log('🍐 Kulpio App initialized');
    console.log('Theme:', ThemeManager.getCurrentTheme());
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();