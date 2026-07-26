// SPDX-License-Identifier: AGPL-3.0-only
// Pear character controller and state management

const PearController = (() => {
  const STATES = {
    FRESH: 'fresh',
    WARN: 'warn',
    ROTTEN: 'rotten'
  };

  const ANIMATIONS = [
    'hop', 'poke', 'dance', 'proud', 'sad', 'shiver', 'dizzy',
    'wiggle', 'chomp', 'stretch', 'wave', 'blink', 'yawn',
    'spin', 'sneeze', 'humming', 'love', 'blush'
  ];

  let currentState = STATES.FRESH;

  const getPearElement = () => {
    return document.querySelector('.assistant-icon');
  };

  const setState = (state) => {
    const pear = getPearElement();
    if (!pear) return;

    Object.values(STATES).forEach(s => pear.classList.remove(s));
    pear.classList.add(state);
    currentState = state;
  };

  const playAnimation = (animation, duration = null) => {
    const pear = getPearElement();
    if (!pear || !ANIMATIONS.includes(animation)) return;

    pear.classList.remove(...ANIMATIONS);
    pear.classList.add(animation);

    if (duration) {
      setTimeout(() => {
        pear.classList.remove(animation);
      }, duration);
    }
  };

  const setColorState = (state) => {
    if (Object.values(STATES).includes(state)) {
      setState(state);
    }
  };

  const getState = () => currentState;

  return {
    STATES,
    ANIMATIONS,
    setState: setColorState,
    playAnimation,
    getState
  };
})();

// Export for external use
if (typeof window !== 'undefined') {
  window.PearController = PearController;
}