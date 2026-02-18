import { BANK_FIELDS, HEADER_HINTS } from "./constants";

function normalizeLabel(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreHeader(header, hints) {
  const normalizedHeader = normalizeLabel(header);
  let score = 0;

  for (const hint of hints) {
    const normalizedHint = normalizeLabel(hint);
    if (normalizedHeader === normalizedHint) score += 10;
    if (normalizedHeader.includes(normalizedHint)) score += 5;
    if (normalizedHint.includes(normalizedHeader)) score += 2;
  }

  return score;
}

export function createEmptyMapping() {
  return BANK_FIELDS.reduce((acc, field) => {
    acc[field.key] = null;
    return acc;
  }, {});
}

export function inferFieldMapping(headers) {
  const mapping = createEmptyMapping();
  const usedHeaders = new Set();

  Object.entries(HEADER_HINTS).forEach(([fieldKey, hints]) => {
    let bestHeader = null;
    let bestScore = 0;

    for (const header of headers) {
      if (usedHeaders.has(header)) continue;
      const score = scoreHeader(header, hints);
      if (score > bestScore) {
        bestHeader = header;
        bestScore = score;
      }
    }

    if (bestHeader && bestScore > 0) {
      mapping[fieldKey] = bestHeader;
      usedHeaders.add(bestHeader);
    }
  });

  return mapping;
}
