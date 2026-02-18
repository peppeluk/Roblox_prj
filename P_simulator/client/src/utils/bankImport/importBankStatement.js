import { IMPORTABLE_EXTENSIONS } from "./constants";
import { parseCsvText } from "./csvParser";
import { inferFieldMapping } from "./mapping";

function getExtension(fileName) {
  const parts = fileName.toLowerCase().split(".");
  if (parts.length < 2) return "";
  return `.${parts.pop()}`;
}

export async function importBankStatementFile(file) {
  const extension = getExtension(file.name);
  if (!IMPORTABLE_EXTENSIONS.includes(extension)) {
    throw new Error(
      `Formato non supportato: ${extension || "sconosciuto"}. Carica CSV/TXT/TSV esportato dalla banca.`
    );
  }

  const text = await file.text();
  const parsed = parseCsvText(text);
  const suggestedMapping = inferFieldMapping(parsed.headers);

  return {
    fileName: file.name,
    extension,
    ...parsed,
    suggestedMapping
  };
}
