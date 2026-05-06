const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

/**
 * Extracts the first URL found in a text string.
 * Returns null if no URL is found.
 */
function extractUrl(text) {
  const matches = text.match(URL_REGEX);
  return matches?.[0] ?? null;
}

/**
 * Extracts all URLs found in a text string.
 */
function extractAllUrls(text) {
  return text.match(URL_REGEX) ?? [];
}

module.exports = { extractUrl, extractAllUrls };
