const DEFAULT_VISION_MAX_DIM = 1600;
const OPTIMIZED_VISION_MAX_DIM = 1024;

/**
 * Apply the build-time vision image optimization to the recipes client section.
 * The generated app uses a 1024px long edge for receipt/label images instead
 * of the 1600px source default, reducing the vision input payload while
 * retaining useful text detail.
 */
export function optimizeVisionSource(source) {
  if (typeof source !== 'string') {
    throw new TypeError('optimizeVisionSource expects a source string');
  }

  const signature = new RegExp(
    `(function\\s+fileToAiImage\\(\\s*file\\s*,\\s*maxDim\\s*=\\s*)${DEFAULT_VISION_MAX_DIM}(\\s*,)`,
  );

  return source.replace(signature, `$1${OPTIMIZED_VISION_MAX_DIM}$2`);
}
