function parseCsvLine(line, delimiter) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function detectDelimiter(lines) {
  const candidates = [";", ",", "\t", "|"];
  let bestDelimiter = ";";
  let bestScore = -1;

  for (const candidate of candidates) {
    const score = lines
      .slice(0, 10)
      .reduce((acc, line) => acc + parseCsvLine(line, candidate).length, 0);

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = candidate;
    }
  }

  return bestDelimiter;
}

function normalizeHeaderName(header, index, usedNames) {
  const fallback = `colonna_${index + 1}`;
  const base = (header || fallback).trim() || fallback;
  let name = base;
  let counter = 1;

  while (usedNames.has(name)) {
    counter += 1;
    name = `${base}_${counter}`;
  }

  usedNames.add(name);
  return name;
}

export function parseCsvText(text) {
  const cleanText = text.replace(/^\uFEFF/, "");
  const lines = cleanText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    throw new Error("Il file non contiene abbastanza righe per l'import.");
  }

  const delimiter = detectDelimiter(lines);
  const rawHeaders = parseCsvLine(lines[0], delimiter);
  const usedNames = new Set();
  const headers = rawHeaders.map((header, index) => normalizeHeaderName(header, index, usedNames));

  const rows = lines.slice(1).map((line, lineIndex) => {
    const values = parseCsvLine(line, delimiter);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    row.__lineNumber = lineIndex + 2;
    return row;
  });

  return {
    headers,
    rows,
    delimiter
  };
}
