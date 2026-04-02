/**
 * Slug normalization utility for URL path deduplication.
 * Tokenizes a path, removes duplicate segments (preserving first occurrence),
 * and builds a canonical path.
 *
 * Usage:
 *   normalizeSlug("/gangnam/gangnam-room/gangnam") → "/gangnam/room"
 *   buildCanonical("https://week3-2og.pages.dev", "/a/") → "https://week3-2og.pages.dev/a/"
 */

const DEPLOY_URL = "https://week3-2og.pages.dev";

/**
 * Normalize a URL path by removing duplicate segments.
 * @param {string} path - e.g. "/gangnam/gangnam-room/gangnam"
 * @returns {string} - deduplicated path e.g. "/gangnam/room"
 */
function normalizeSlug(path) {
  const segments = path.split("/").filter(Boolean);
  const seen = new Set();
  const result = [];
  for (const seg of segments) {
    const lower = seg.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(seg);
    }
  }
  const normalized = "/" + result.join("/");
  return path.endsWith("/") && normalized !== "/" ? normalized + "/" : normalized;
}

/**
 * Build a full canonical URL from a base URL and path.
 * @param {string} base - e.g. "https://week3-2og.pages.dev"
 * @param {string} path - e.g. "/a/"
 * @returns {string} - e.g. "https://week3-2og.pages.dev/a/"
 */
function buildCanonical(base, path) {
  const cleanBase = base.replace(/\/+$/, "");
  const normalizedPath = normalizeSlug(path);
  return cleanBase + normalizedPath;
}

/* ======= TESTS ======= */
function runTests() {
  const tests = [
    { input: "/", expected: "/" },
    { input: "/a/", expected: "/a/" },
    { input: "/gangnam/gangnam", expected: "/gangnam" },
    { input: "/gangnam/gangnam-room/gangnam/", expected: "/gangnam/gangnam-room/" },
    { input: "/busan/busan/haeundae", expected: "/busan/haeundae" },
    { input: "/a/b/c/a/", expected: "/a/b/c/" },
  ];

  let passed = 0;
  for (const t of tests) {
    const result = normalizeSlug(t.input);
    if (result === t.expected) {
      passed++;
    } else {
      console.error(`FAIL: normalizeSlug("${t.input}") = "${result}", expected "${t.expected}"`);
    }
  }

  const canonicalTests = [
    { base: DEPLOY_URL, path: "/", expected: DEPLOY_URL + "/" },
    { base: DEPLOY_URL, path: "/a/", expected: DEPLOY_URL + "/a/" },
  ];

  for (const t of canonicalTests) {
    const result = buildCanonical(t.base, t.path);
    if (result === t.expected) {
      passed++;
    } else {
      console.error(`FAIL: buildCanonical("${t.base}", "${t.path}") = "${result}", expected "${t.expected}"`);
    }
  }

  const total = tests.length + canonicalTests.length;
  console.log(`Slug normalize tests: ${passed}/${total} passed`);
  return passed === total;
}

if (typeof module !== "undefined") {
  module.exports = { normalizeSlug, buildCanonical, runTests };
}
