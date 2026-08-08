// Supported UI languages: keep this list intentionally focused so Kulpio
// ships a smaller, higher-quality language set. The locale source files may
// retain legacy entries for compatibility, but users only see these 16.
const SUPPORTED_LANGUAGES = [
  'en','ru','ro','de','fr','es','it','pt',
  'pl','tr','ar','zh','ja','ko','hi','uk',
];

const SUPPORTED_LANGUAGE_SET = new Set(SUPPORTED_LANGUAGES);

function applyLanguagePolicy() {
  const select = document.getElementById('langSelect');
  if (!select) return;

  // Remove legacy language choices from the UI.
  Array.from(select.options).forEach((option) => {
    option.hidden = !SUPPORTED_LANGUAGE_SET.has(option.value);
    if (!SUPPORTED_LANGUAGE_SET.has(option.value)) option.remove();
  });

  // A previously selected legacy language must never leave the app in a
  // partially translated state.
  const stored = localStorage.getItem('kulpio-lang') || 'en';
  if (!SUPPORTED_LANGUAGE_SET.has(stored)) {
    localStorage.setItem('kulpio-lang', 'en');
    if (typeof setLang === 'function') setLang('en');
  }

  select.value = SUPPORTED_LANGUAGE_SET.has(stored) ? stored : 'en';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyLanguagePolicy, { once: true });
} else {
  applyLanguagePolicy();
}
