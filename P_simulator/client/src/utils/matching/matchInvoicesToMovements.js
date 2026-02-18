function compactText(input) {
  return String(input ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeText(input) {
  return compactText(input)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeCbiCode(value) {
  const normalized = compactText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return normalized.length >= 2 ? normalized : null;
}

function extractCbiFromText(value) {
  const text = compactText(value);
  if (!text) return null;

  const patterns = [
    /(?:causale\s*cbi|codice\s*cbi|cbi)\s*[:-]?\s*([A-Za-z0-9]{2,20})/i,
    /\bcbi[:\s-]+([A-Za-z0-9]{2,20})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const normalized = normalizeCbiCode(match[1]);
    if (normalized) return normalized;
  }

  return null;
}

function toDate(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function diffDays(dateA, dateB) {
  if (!dateA || !dateB) return null;
  const ms = Math.abs(dateA.getTime() - dateB.getTime());
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function containsInvoiceNumber(movement, invoiceNumber) {
  const token = normalizeText(invoiceNumber).replace(/[^a-z0-9]/g, "");
  if (!token) return false;

  const haystack = normalizeText(
    `${movement.reference || ""} ${movement.description || ""}`.replace(/[^a-z0-9]/g, " ")
  ).replace(/\s+/g, "");

  return haystack.includes(token);
}

function counterpartyHintMatch(movement, invoice) {
  const counterparty = normalizeText(invoice.controparteName);
  if (!counterparty) return false;

  const candidateText = normalizeText(
    `${movement.counterparty || ""} ${movement.description || ""} ${movement.reference || ""}`
  );
  const mainTokens = counterparty
    .split(" ")
    .filter((token) => token.length >= 4);

  return mainTokens.some((token) => candidateText.includes(token));
}

function resolveMovementCbi(movement) {
  return (
    normalizeCbiCode(movement.cbiCausale) ||
    extractCbiFromText(movement.reference) ||
    extractCbiFromText(movement.description) ||
    null
  );
}

function evaluateCandidate(invoice, movement, options) {
  const reasons = [];
  let score = 0;

  const invoiceAmount = Number(invoice.importoDaPagare);
  const movementAmount = Math.abs(Number(movement.amount));
  const amountDiff = Math.abs(invoiceAmount - movementAmount);

  if (amountDiff <= options.amountTolerance) {
    score += 55;
    reasons.push("Importo coincidente");
  } else if (amountDiff <= 1) {
    score += 40;
    reasons.push("Importo quasi coincidente");
  } else if (amountDiff <= 5) {
    score += 25;
    reasons.push("Importo simile");
  } else {
    const dynamicTolerance = Math.max(invoiceAmount * 0.05, 15);
    if (amountDiff > dynamicTolerance) return null;
    score += 10;
    reasons.push("Importo parzialmente compatibile");
  }

  const targetDate = toDate(invoice.dataScadenza || invoice.dataDocumento);
  const movementDate = toDate(movement.bookingDate);
  const dayDifference = diffDays(targetDate, movementDate);

  if (dayDifference !== null) {
    if (dayDifference <= 1) {
      score += 20;
      reasons.push("Data in linea con la scadenza");
    } else if (dayDifference <= 5) {
      score += 14;
      reasons.push("Data vicina alla scadenza");
    } else if (dayDifference <= options.maxDateDistanceDays) {
      score += 6;
      reasons.push("Data compatibile");
    } else {
      score -= 8;
      reasons.push("Data lontana dalla scadenza");
    }
  }

  const invoiceCbi = normalizeCbiCode(invoice.cbiCausale);
  const movementCbi = resolveMovementCbi(movement);
  let cbiStatus = "none";

  if (invoiceCbi && movementCbi) {
    if (invoiceCbi === movementCbi) {
      score += 35;
      cbiStatus = "match";
      reasons.push("Causale CBI coincidente");
    } else {
      score -= 45;
      cbiStatus = "mismatch";
      reasons.push("Causale CBI non coerente");
    }
  } else if (invoiceCbi && !movementCbi) {
    score -= 5;
    reasons.push("CBI presente in fattura ma assente nel movimento");
  }

  if (containsInvoiceNumber(movement, invoice.numero)) {
    score += 14;
    reasons.push("Numero fattura rilevato nella causale/riferimento");
  }

  if (counterpartyHintMatch(movement, invoice)) {
    score += 8;
    reasons.push("Controparte compatibile");
  }

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  return {
    invoiceId: invoice.id,
    movementId: movement.id,
    score,
    reasons,
    amountDiff,
    dayDifference,
    invoiceCbi,
    movementCbi,
    cbiStatus
  };
}

function classifySuggestion(score, autoScore) {
  if (score >= autoScore) return "auto";
  if (score >= 55) return "review";
  return "weak";
}

export function matchInvoicesToMovements({ invoices, movements, options = {} }) {
  const settings = {
    amountTolerance: options.amountTolerance ?? 0.05,
    maxDateDistanceDays: options.maxDateDistanceDays ?? 30,
    minScore: options.minScore ?? 45,
    autoScore: options.autoScore ?? 80
  };

  const sortedInvoices = [...invoices].sort((a, b) =>
    (a.dataScadenza || a.dataDocumento).localeCompare(b.dataScadenza || b.dataDocumento)
  );

  const usedMovementIds = new Set();
  const suggestions = [];
  const unmatchedInvoices = [];

  sortedInvoices.forEach((invoice) => {
    const expectedDirection = invoice.tipo === "emessa" ? "in" : "out";
    const candidates = [];

    movements.forEach((movement) => {
      if (usedMovementIds.has(movement.id)) return;
      if (movement.direction !== expectedDirection) return;

      const evaluated = evaluateCandidate(invoice, movement, settings);
      if (!evaluated) return;
      candidates.push({
        ...evaluated,
        movement
      });
    });

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    if (!best || best.score < settings.minScore) {
      unmatchedInvoices.push(invoice);
      return;
    }

    const suggestionType = classifySuggestion(best.score, settings.autoScore);
    usedMovementIds.add(best.movement.id);

    suggestions.push({
      id: `${invoice.id}__${best.movement.id}`,
      type: suggestionType,
      score: best.score,
      reasons: best.reasons,
      amountDiff: best.amountDiff,
      dayDifference: best.dayDifference,
      cbiStatus: best.cbiStatus,
      invoice,
      movement: best.movement
    });
  });

  const matchedMovementIds = new Set(suggestions.map((item) => item.movement.id));
  const unmatchedMovements = movements.filter((movement) => !matchedMovementIds.has(movement.id));

  return {
    suggestions,
    unmatchedInvoices,
    unmatchedMovements,
    stats: {
      totalInvoices: invoices.length,
      totalMovements: movements.length,
      matched: suggestions.length,
      auto: suggestions.filter((item) => item.type === "auto").length,
      review: suggestions.filter((item) => item.type === "review").length,
      weak: suggestions.filter((item) => item.type === "weak").length,
      unmatchedInvoices: unmatchedInvoices.length,
      unmatchedMovements: unmatchedMovements.length
    }
  };
}
