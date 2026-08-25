/**
 * Compare two semver-ish version strings ("2.1.0").
 * @returns {number} -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareVersions(a = '0.0.0', b = '0.0.0') {
  const pa = String(a).replace(/^v/, '').split('.').map(Number);
  const pb = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return na < nb ? -1 : 1;
  }
  return 0;
}

/**
 * Extract a version like "2.1.0" from engine output such as "GitSwitch v2.1.0".
 * @returns {string|null}
 */
export function extractVersion(text = '') {
  const m = text.match(/v?(\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
}
