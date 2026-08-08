import assert from 'node:assert/strict';
import test from 'node:test';
import { SUPPORTED_TRANSLATION_LANGS, buildTranslationPrompt } from '../ai-proxy/translation-worker.js';

test('translation layer exposes exactly 16 maintained languages', () => {
  assert.equal(Object.keys(SUPPORTED_TRANSLATION_LANGS).length, 16);
  assert.deepEqual(Object.keys(SUPPORTED_TRANSLATION_LANGS), [
    'en', 'ru', 'ro', 'de', 'fr', 'es', 'it', 'pt',
    'pl', 'tr', 'ar', 'zh', 'ja', 'ko', 'hi', 'uk',
  ]);
});

test('translation prompt preserves order, meaning and culinary terminology', () => {
  const prompt = buildTranslationPrompt('ro', ['Chicken Stock', '200 g Greek yogurt']);
  assert.match(prompt, /professional native-speaking food editor/);
  assert.match(prompt, /same number of strings in the same order/);
  assert.match(prompt, /culinary meaning/);
  assert.match(prompt, /stock.*broth|broth.*inventory/i);
  assert.match(prompt, /Greek yogurt/);
});

test('Ukrainian translation policy explicitly avoids Russian substitution', () => {
  const prompt = buildTranslationPrompt('uk', ['Chicken soup']);
  assert.match(prompt, /Ukrainian vocabulary/);
  assert.match(prompt, /do not replace Ukrainian with Russian/);
});

test('unsupported translation language is rejected before model use', () => {
  assert.throws(() => buildTranslationPrompt('nl', ['Milk']), /unsupported language/);
});
