// Build-time guard for vision payload size.
// Keep the source helper readable while ensuring the generated app sends
// smaller images to Workers AI. 1024px preserves receipt/label readability
// while cutting the pixel payload substantially versus full 1600px frames.
export function optimizeVisionSource(html) {
  return html.replaceAll('fileToAiImage(file, 1600)', 'fileToAiImage(file, 1024)');
}
