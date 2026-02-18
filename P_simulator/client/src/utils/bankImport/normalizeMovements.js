function parseDate(input) {
  if (!input) return null;
  const value = String(input).trim();
  if (!value) return null;

  const isoMatch = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, "0");
    const day = isoMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const euMatch = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (euMatch) {
    const day = euMatch[1].padStart(2, "0");
    const month = euMatch[2].padStart(2, "0");
    const year = euMatch[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

function parseNumber(input) {
  if (input === null || input === undefined) return null;
  let value = String(input).trim();
  if (!value) return null;

  let sign = 1;
  if (value.includes("(") && value.includes(")")) sign = -1;
  if (value.startsWith("-")) sign = -1;
  if (value.endsWith("-")) sign = -1;

  value = value
    .replace(/[^\d,.-]/g, "")
    .replace(/[()]/g, "")
    .replace(/-/g, "");

  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      value = value.replace(/\./g, "").replace(",", ".");
    } else {
      value = value.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    value = value.replace(/\./g, "").replace(",", ".");
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return parsed * sign;
}

function compactText(input) {
  return String(input ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeCbiCode(value) {
  const cleaned = compactText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (cleaned.length < 2) return null;
  return cleaned;
}

function extractCbiFromText(text) {
  const normalizedText = compactText(text);
  if (!normalizedText) return null;

  const patterns = [
    /(?:causale\s*cbi|codice\s*cbi|cbi)\s*[:-]?\s*([A-Za-z0-9]{2,20})/i,
    /\bcbi[:\s-]+([A-Za-z0-9]{2,20})/i
  ];

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    if (!match) continue;
    const normalized = normalizeCbiCode(match[1]);
    if (normalized) return normalized;
  }

  return null;
}

function movementKey(movement) {
  return [
    movement.bookingDate,
    movement.amount.toFixed(2),
    movement.reference.toLowerCase(),
    movement.description.toLowerCase()
  ].join("|");
}

function getMappedValue(row, mapping, fieldKey) {
  const column = mapping[fieldKey];
  if (!column) return "";
  return row[column];
}

function resolveAmount(row, mapping) {
  const directAmount = getMappedValue(row, mapping, "amount");
  if (directAmount) {
    return parseNumber(directAmount);
  }

  const debit = parseNumber(getMappedValue(row, mapping, "debit"));
  const credit = parseNumber(getMappedValue(row, mapping, "credit"));

  if (debit !== null && credit !== null) {
    return Math.abs(credit) - Math.abs(debit);
  }
  if (credit !== null) return Math.abs(credit);
  if (debit !== null) return -Math.abs(debit);
  return null;
}

export function normalizeBankRows({ rows, mapping }) {
  const missingMandatory = [];
  if (!mapping.bookingDate) missingMandatory.push("Data contabile");
  if (!mapping.amount && !mapping.debit && !mapping.credit) {
    missingMandatory.push("Importo o coppia Dare/Avere");
  }

  if (missingMandatory.length > 0) {
    return {
      movements: [],
      errors: [
        {
          rowNumber: null,
          reason: `Mapping incompleto: ${missingMandatory.join(", ")}`
        }
      ],
      duplicates: [],
      stats: {
        totalRows: rows.length,
        importedRows: 0,
        errorRows: rows.length,
        duplicateRows: 0
      }
    };
  }

  const seen = new Set();
  const movements = [];
  const errors = [];
  const duplicates = [];

  rows.forEach((row) => {
    const rowNumber = row.__lineNumber ?? null;

    const bookingDate = parseDate(getMappedValue(row, mapping, "bookingDate"));
    if (!bookingDate) {
      errors.push({
        rowNumber,
        reason: "Data contabile non valida"
      });
      return;
    }

    const amount = resolveAmount(row, mapping);
    if (amount === null || Number.isNaN(amount) || amount === 0) {
      errors.push({
        rowNumber,
        reason: "Importo non valido o pari a zero"
      });
      return;
    }

    const movement = {
      id: `row_${rowNumber ?? movements.length + 1}`,
      bookingDate,
      valueDate: parseDate(getMappedValue(row, mapping, "valueDate")),
      amount,
      direction: amount > 0 ? "in" : "out",
      description: compactText(getMappedValue(row, mapping, "description")),
      reference: compactText(getMappedValue(row, mapping, "reference")),
      counterparty: compactText(getMappedValue(row, mapping, "counterparty")),
      balance: parseNumber(getMappedValue(row, mapping, "balance")),
      account: compactText(getMappedValue(row, mapping, "account")),
      sourceLine: rowNumber
    };

    const mappedCbi = normalizeCbiCode(getMappedValue(row, mapping, "cbiCausale"));
    movement.cbiCausale =
      mappedCbi ||
      extractCbiFromText(movement.description) ||
      extractCbiFromText(movement.reference);

    const key = movementKey(movement);
    if (seen.has(key)) {
      duplicates.push({
        rowNumber,
        reason: "Possibile duplicato"
      });
      return;
    }
    seen.add(key);

    movements.push(movement);
  });

  return {
    movements,
    errors,
    duplicates,
    stats: {
      totalRows: rows.length,
      importedRows: movements.length,
      errorRows: errors.length,
      duplicateRows: duplicates.length
    }
  };
}
