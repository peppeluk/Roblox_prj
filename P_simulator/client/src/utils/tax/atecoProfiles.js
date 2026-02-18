const PROFESSIONAL_FIRST2 = new Set([
  58, 59, 60, 61, 62, 63, 64, 65, 66, 69, 70, 71, 72, 73, 74, 75, 85, 86, 87, 88
]);

const COMMERCIAL_FIRST2 = new Set([45, 46, 47, 49, 50, 51, 52, 53, 55, 56, 77, 79]);

const ARTISAN_FIRST2 = new Set([
  1, 2, 3, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
  27, 28, 29, 30, 31, 32, 33, 35, 36, 37, 38, 39, 41, 42, 43, 95, 96
]);

const CONTRIBUTION_PROFILES = {
  gestioneSeparata: {
    profileKey: "gestione-separata",
    profileLabel: "Gestione separata (professionisti)",
    contributiPercentuale: 26.07,
    note: "Aliquota suggerita per professionisti senza altra tutela previdenziale."
  },
  artigiani: {
    profileKey: "artigiani",
    profileLabel: "INPS Artigiani",
    contributiPercentuale: 24,
    note: "Aliquota INPS 2026 oltre il minimale contributivo."
  },
  commercianti: {
    profileKey: "commercianti",
    profileLabel: "INPS Commercianti",
    contributiPercentuale: 24.48,
    note: "Aliquota INPS 2026 oltre il minimale contributivo."
  }
};

function normalizeAtecoCode(code) {
  return String(code ?? "")
    .trim()
    .replace(",", ".")
    .replace(/\s+/g, "");
}

function extractDigits(normalizedCode) {
  return normalizedCode.replace(/\D/g, "");
}

function getFirstTwoDigits(digits) {
  if (digits.length < 2) return null;
  return Number(digits.slice(0, 2));
}

function getForfettarioCoefficient(firstTwoDigits, digits) {
  if (firstTwoDigits === null) return 67;

  if (firstTwoDigits === 10 || firstTwoDigits === 11) return 40;
  if (firstTwoDigits === 46 && digits.startsWith("461")) return 62;
  if (firstTwoDigits === 47 && /^478[2-9]/.test(digits)) return 54;

  if ([45, 46, 47, 55, 56].includes(firstTwoDigits)) return 40;
  if ([49, 50, 51, 52, 53].includes(firstTwoDigits)) return 62;
  if ([41, 42, 43, 68].includes(firstTwoDigits)) return 86;
  if (PROFESSIONAL_FIRST2.has(firstTwoDigits)) return 78;

  return 67;
}

function getContributionProfile(firstTwoDigits) {
  if (firstTwoDigits !== null && COMMERCIAL_FIRST2.has(firstTwoDigits)) {
    return CONTRIBUTION_PROFILES.commercianti;
  }

  if (firstTwoDigits !== null && (ARTISAN_FIRST2.has(firstTwoDigits) || (firstTwoDigits >= 10 && firstTwoDigits <= 43))) {
    return CONTRIBUTION_PROFILES.artigiani;
  }

  return CONTRIBUTION_PROFILES.gestioneSeparata;
}

export function getAtecoPreset(codiceAteco) {
  const normalizedCode = normalizeAtecoCode(codiceAteco);
  const digits = extractDigits(normalizedCode);
  const firstTwoDigits = getFirstTwoDigits(digits);
  const contributionProfile = getContributionProfile(firstTwoDigits);
  const coefficienteRedditivita = getForfettarioCoefficient(firstTwoDigits, digits);
  const recognized = firstTwoDigits !== null;

  return {
    codiceAteco: normalizedCode,
    firstTwoDigits,
    recognized,
    coefficienteRedditivita,
    ...contributionProfile,
    note: recognized
      ? contributionProfile.note
      : "Codice ATECO non riconosciuto: uso valori previdenziali suggeriti di default."
  };
}
