export const IMPORTABLE_EXTENSIONS = [".csv", ".txt", ".tsv"];

export const BANK_FIELDS = [
  {
    key: "bookingDate",
    label: "Data contabile",
    required: true
  },
  {
    key: "valueDate",
    label: "Data valuta",
    required: false
  },
  {
    key: "amount",
    label: "Importo (colonna unica)",
    required: false
  },
  {
    key: "debit",
    label: "Addebito (-)",
    required: false
  },
  {
    key: "credit",
    label: "Accredito (+)",
    required: false
  },
  {
    key: "description",
    label: "Causale",
    required: false
  },
  {
    key: "cbiCausale",
    label: "Causale CBI",
    required: false
  },
  {
    key: "reference",
    label: "Riferimento",
    required: false
  },
  {
    key: "counterparty",
    label: "Controparte",
    required: false
  },
  {
    key: "balance",
    label: "Saldo",
    required: false
  },
  {
    key: "account",
    label: "Conto / IBAN",
    required: false
  }
];

export const HEADER_HINTS = {
  bookingDate: ["data contabile", "booking date", "data operazione", "data movimento", "date"],
  valueDate: ["data valuta", "valuta", "value date"],
  amount: ["importo", "amount", "totale", "ammontare", "valore"],
  debit: ["addebito", "debit", "uscite", "dare"],
  credit: ["accredito", "credit", "entrate", "avere"],
  description: ["causale", "descrizione", "descrizione operazione", "details", "description"],
  cbiCausale: ["causale cbi", "cbi", "codice cbi", "causale abi", "causale pagamento cbi"],
  reference: ["riferimento", "cro", "trn", "id operazione", "transaction id", "numero documento"],
  counterparty: ["beneficiario", "ordinante", "controparte", "intestatario", "counterparty"],
  balance: ["saldo", "balance", "saldo disponibile", "running balance"],
  account: ["iban", "conto", "account", "numero conto"]
};
