// SPDX-License-Identifier: AGPL-3.0-only
// UI interactions and event handlers

const UIInteractions = (() => {
  const setupThemeToggle = () => {
    document.addEventListener('click', (e) => {
      if (e.target?.classList.contains('theme-toggle')) {
        ThemeManager.toggleTheme();
      }
    });
  };

  const setupPearInteractions = () => {
    const pear = document.querySelector('.assistant-icon');
    if (!pear) return;

    pear.addEventListener('click', () => {
      PearController.playAnimation('poke', 480);
    });

    pear.addEventListener('touchstart', () => {
      PearController.playAnimation('love');
    });
  };

  const setupSwipeGestures = () => {
    document.addEventListener('touchstart', (e) => {
      const target = e.target?.closest('.prod-item');
      if (!target) return;
      
      target.touchStartX = e.touches[0].clientX;
      target.touchStartY = e.touches[0].clientY;
    });

    document.addEventListener('touchmove', (e) => {
      const target = e.target?.closest('.prod-item');
      if (!target || !target.touchStartX) return;

      const deltaX = e.touches[0].clientX - target.touchStartX;
      const deltaY = e.touches[0].clientY - target.touchStartY;

      if (Math.abs(deltaY) > Math.abs(deltaX)) return;

      target.style.transform = `translateX(${deltaX}px)`;
    });

    document.addEventListener('touchend', (e) => {
      const target = e.target?.closest('.prod-item');
      if (!target) return;

      const deltaX = (e.changedTouches[0]?.clientX || 0) - (target.touchStartX || 0);
      const threshold = 80;

      if (Math.abs(deltaX) > threshold) {
        target.classList.add(deltaX > 0 ? 'sw-right' : 'sw-left');
        setTimeout(() => target.remove(), 300);
      } else {
        target.style.transform = '';
      }

      delete target.touchStartX;
      delete target.touchStartY;
    });
  };

  const setupFABInteractions = () => {
    document.addEventListener('click', (e) => {
      if (e.target?.classList.contains('fab')) {
        PearController.playAnimation('hop', 700);
      }
    });
  };

  const initialize = () => {
    setupThemeToggle();
    setupPearInteractions();
    setupSwipeGestures();
    setupFABInteractions();
  };

  return {
    initialize
  };
})();

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => UIInteractions.initialize());
} else {
  UIInteractions.initialize();
}