function getDirectChildrenByLocalName(node, localName) {
  return Array.from(node?.children ?? []).filter((child) => child.localName === localName);
}

function getElementsByPath(root, path) {
  let nodes = [root];
  for (const segment of path) {
    const next = [];
    nodes.forEach((node) => next.push(...getDirectChildrenByLocalName(node, segment)));
    if (next.length === 0) return [];
    nodes = next;
  }
  return nodes;
}

function getFirstElementByPath(root, path) {
  return getElementsByPath(root, path)[0] ?? null;
}

function getTextByPath(root, path) {
  const element = getFirstElementByPath(root, path);
  return element?.textContent?.trim() ?? "";
}

function compactText(input) {
  return String(input ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeDate(value) {
  const text = compactText(value);
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const euMatch = text.match(/^(\d{2})[/.](\d{2})[/.](\d{4})$/);
  if (euMatch) return `${euMatch[3]}-${euMatch[2]}-${euMatch[1]}`;

  return null;
}

function parseAmount(value) {
  const text = compactText(value);
  if (!text) return null;

  const normalized = text
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=.*[,])/g, "")
    .replace(",", ".");

  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function normalizeCbiCode(value) {
  const code = compactText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return code.length >= 2 ? code : null;
}

function extractCbiFromText(value) {
  const text = compactText(value);
  if (!text) return null;
  const match = text.match(/(?:causale\s*cbi|codice\s*cbi|cbi)\s*[:-]?\s*([A-Za-z0-9]{2,20})/i);
  if (!match) return null;
  return normalizeCbiCode(match[1]);
}

function extractPartyData(body, tipoFattura) {
  const partyNode =
    tipoFattura === "emessa"
      ? getFirstElementByPath(body, ["CessionarioCommittente"])
      : getFirstElementByPath(body, ["CedentePrestatore"]);

  if (!partyNode) {
    return {
      name: "",
      vatCode: "",
      fiscalCode: ""
    };
  }

  const denominazione = getTextByPath(partyNode, ["DatiAnagrafici", "Anagrafica", "Denominazione"]);
  const nome = getTextByPath(partyNode, ["DatiAnagrafici", "Anagrafica", "Nome"]);
  const cognome = getTextByPath(partyNode, ["DatiAnagrafici", "Anagrafica", "Cognome"]);
  const fullName = compactText([nome, cognome].filter(Boolean).join(" "));

  return {
    name: denominazione || fullName || "",
    vatCode: getTextByPath(partyNode, ["DatiAnagrafici", "IdFiscaleIVA", "IdCodice"]),
    fiscalCode: getTextByPath(partyNode, ["DatiAnagrafici", "CodiceFiscale"])
  };
}

function extractPaymentData(body) {
  const detailNodes = getElementsByPath(body, ["DatiPagamento", "DettaglioPagamento"]);
  if (detailNodes.length === 0) {
    return {
      dueDate: null,
      amountDue: null,
      cbiCode: null
    };
  }

  const dueDates = [];
  const amounts = [];
  let cbiCode = null;

  detailNodes.forEach((detailNode) => {
    const dueDate = normalizeDate(getTextByPath(detailNode, ["DataScadenzaPagamento"]));
    if (dueDate) dueDates.push(dueDate);

    const amountDue = parseAmount(getTextByPath(detailNode, ["ImportoPagamento"]));
    if (amountDue !== null) amounts.push(amountDue);

    if (!cbiCode) {
      cbiCode =
        normalizeCbiCode(getTextByPath(detailNode, ["CodicePagamento"])) ||
        normalizeCbiCode(getTextByPath(detailNode, ["CausalePagamento"])) ||
        extractCbiFromText(getTextByPath(detailNode, ["CausalePagamento"]));
    }
  });

  const sortedDueDates = dueDates.sort();
  const totalAmountDue = amounts.length > 0 ? amounts.reduce((acc, value) => acc + value, 0) : null;

  return {
    dueDate: sortedDueDates[0] ?? null,
    amountDue: totalAmountDue,
    cbiCode
  };
}

function buildInvoiceId(invoice) {
  return [
    invoice.tipo,
    invoice.numero,
    invoice.dataDocumento,
    invoice.importoDaPagare.toFixed(2),
    invoice.controparteVat || invoice.controparteName || "na"
  ].join("|");
}

function parseSingleInvoiceXml({ xmlText, fileName, tipoFattura }) {
  const xmlDoc = new DOMParser().parseFromString(xmlText, "application/xml");
  const parseErrors = xmlDoc.getElementsByTagName("parsererror");
  if (parseErrors.length > 0) {
    throw new Error("XML non valido");
  }

  const root = xmlDoc.documentElement;
  const body = getFirstElementByPath(root, ["FatturaElettronicaBody"]);
  if (!body) {
    throw new Error("Nodo FatturaElettronicaBody non trovato");
  }

  const numero = compactText(
    getTextByPath(body, ["DatiGenerali", "DatiGeneraliDocumento", "Numero"])
  );
  const dataDocumento = normalizeDate(
    getTextByPath(body, ["DatiGenerali", "DatiGeneraliDocumento", "Data"])
  );
  const importoTotale = parseAmount(
    getTextByPath(body, ["DatiGenerali", "DatiGeneraliDocumento", "ImportoTotaleDocumento"])
  );

  const payment = extractPaymentData(body);
  const party = extractPartyData(body, tipoFattura);
  const fallbackCbi =
    extractCbiFromText(getTextByPath(body, ["DatiGenerali", "DatiGeneraliDocumento", "Causale"])) ||
    null;

  const importoDaPagare = payment.amountDue ?? importoTotale;
  const dataScadenza = payment.dueDate ?? dataDocumento;
  const cbiCausale = payment.cbiCode ?? fallbackCbi;

  if (!numero) throw new Error("Numero fattura mancante");
  if (!dataDocumento) throw new Error("Data documento non valida");
  if (importoDaPagare === null || importoDaPagare <= 0) {
    throw new Error("Importo fattura non valido");
  }

  const invoice = {
    id: "",
    fileName,
    tipo: tipoFattura,
    numero,
    dataDocumento,
    dataScadenza,
    importoTotale: importoTotale ?? importoDaPagare,
    importoDaPagare,
    controparteName: party.name,
    controparteVat: party.vatCode,
    controparteFiscalCode: party.fiscalCode,
    cbiCausale
  };

  invoice.id = buildInvoiceId(invoice);
  return invoice;
}

export async function importFattureElettronicheXml(files, tipoFattura) {
  const supportedFiles = files.filter((file) => file.name.toLowerCase().endsWith(".xml"));
  if (supportedFiles.length === 0) {
    throw new Error("Nessun file XML valido selezionato.");
  }

  const invoices = [];
  const errors = [];
  const seen = new Set();

  for (const file of supportedFiles) {
    try {
      const xmlText = await file.text();
      const parsed = parseSingleInvoiceXml({
        xmlText,
        fileName: file.name,
        tipoFattura
      });

      if (seen.has(parsed.id)) {
        errors.push({
          fileName: file.name,
          reason: "Possibile duplicato fattura"
        });
        continue;
      }

      seen.add(parsed.id);
      invoices.push(parsed);
    } catch (error) {
      errors.push({
        fileName: file.name,
        reason: error.message || "Errore durante il parsing XML"
      });
    }
  }

  return {
    invoices,
    errors,
    stats: {
      totalFiles: supportedFiles.length,
      importedFiles: invoices.length,
      errorFiles: errors.length
    }
  };
}
