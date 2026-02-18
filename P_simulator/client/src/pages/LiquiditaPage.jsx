import { useMemo, useState } from "react";
import { BANK_FIELDS } from "../utils/bankImport/constants";
import { importBankStatementFile } from "../utils/bankImport/importBankStatement";
import { normalizeBankRows } from "../utils/bankImport/normalizeMovements";
import { importFattureElettronicheXml } from "../utils/invoiceImport/importFattureElettronicheXml";
import { matchInvoicesToMovements } from "../utils/matching/matchInvoicesToMovements";
import {
  loadLatestReconciliationSession,
  saveReconciliationSession
} from "../services/reconciliationPersistence";

const eur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const DEFAULT_MATCHING = { amountTolerance: 0.05, maxDateDistanceDays: 30, minScore: 45, autoScore: 80 };

function fmtDateTime(v) {
  const d = new Date(v || "");
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("it-IT");
}

function LiquiditaPage() {
  const [importData, setImportData] = useState(null);
  const [mapping, setMapping] = useState(null);
  const [preview, setPreview] = useState(null);
  const [bankError, setBankError] = useState("");
  const [isBankLoading, setIsBankLoading] = useState(false);

  const [invoiceType, setInvoiceType] = useState("emessa");
  const [invoiceImport, setInvoiceImport] = useState(null);
  const [invoiceError, setInvoiceError] = useState("");
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);

  const [matchingConfig, setMatchingConfig] = useState(DEFAULT_MATCHING);
  const [matchingResult, setMatchingResult] = useState(null);
  const [decisionMap, setDecisionMap] = useState({});

  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  const suggestions = useMemo(
    () =>
      (matchingResult?.suggestions ?? []).map((s) => ({
        ...s,
        decision: decisionMap[s.id] ?? "pending"
      })),
    [matchingResult, decisionMap]
  );

  const decisionStats = useMemo(
    () =>
      suggestions.reduce(
        (a, s) => {
          if (s.decision === "confirmed") a.confirmed += 1;
          else if (s.decision === "rejected") a.rejected += 1;
          else a.pending += 1;
          return a;
        },
        { confirmed: 0, rejected: 0, pending: 0 }
      ),
    [suggestions]
  );

  async function onBankUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsBankLoading(true);
    setBankError("");
    setStatus("");
    setPreview(null);
    setMatchingResult(null);
    setDecisionMap({});
    try {
      const imported = await importBankStatementFile(file);
      setImportData(imported);
      setMapping(imported.suggestedMapping);
    } catch (err) {
      setBankError(err.message || "Errore import estratto conto");
      setImportData(null);
      setMapping(null);
    } finally {
      setIsBankLoading(false);
    }
  }

  async function onInvoiceUpload(event) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setIsInvoiceLoading(true);
    setInvoiceError("");
    setStatus("");
    setMatchingResult(null);
    setDecisionMap({});
    try {
      const imported = await importFattureElettronicheXml(files, invoiceType);
      setInvoiceImport(imported);
    } catch (err) {
      setInvoiceError(err.message || "Errore import XML");
      setInvoiceImport(null);
    } finally {
      setIsInvoiceLoading(false);
    }
  }

  function generatePreview() {
    if (!importData || !mapping) return;
    const normalized = normalizeBankRows({ rows: importData.rows, mapping });
    setPreview(normalized);
    setMatchingResult(null);
    setDecisionMap({});
  }

  function runMatching() {
    if (!preview?.movements?.length || !invoiceImport?.invoices?.length) return;
    const result = matchInvoicesToMovements({
      invoices: invoiceImport.invoices,
      movements: preview.movements,
      options: matchingConfig
    });
    const decisions = {};
    result.suggestions.forEach((s) => {
      decisions[s.id] = "pending";
    });
    setMatchingResult(result);
    setDecisionMap(decisions);
  }

  function setDecision(id, decision) {
    setDecisionMap((prev) => ({ ...prev, [id]: decision }));
  }

  function confirmAuto() {
    setDecisionMap((prev) => {
      const next = { ...prev };
      suggestions.forEach((s) => {
        if (s.type === "auto") next[s.id] = "confirmed";
      });
      return next;
    });
  }

  function resetDecisions() {
    const next = {};
    suggestions.forEach((s) => {
      next[s.id] = "pending";
    });
    setDecisionMap(next);
  }

  function buildSnapshot() {
    return {
      bankImport: importData
        ? {
            fileName: importData.fileName,
            extension: importData.extension,
            delimiter: importData.delimiter,
            headers: importData.headers,
            rows: importData.rows?.slice(0, 300) ?? [],
            suggestedMapping: importData.suggestedMapping ?? null
          }
        : null,
      mapping: mapping ?? null,
      preview: preview ?? null,
      invoices: { invoiceType, invoiceImport: invoiceImport ?? null },
      matching: { matchingConfig, matchingResult: matchingResult ?? null, decisions: decisionMap }
    };
  }

  function applySnapshot(snapshot) {
    setImportData(snapshot?.bankImport ?? null);
    setMapping(snapshot?.mapping ?? snapshot?.bankImport?.suggestedMapping ?? null);
    setPreview(snapshot?.preview ?? null);
    setInvoiceType(snapshot?.invoices?.invoiceType ?? "emessa");
    setInvoiceImport(snapshot?.invoices?.invoiceImport ?? null);
    setMatchingConfig(snapshot?.matching?.matchingConfig ?? DEFAULT_MATCHING);
    setMatchingResult(snapshot?.matching?.matchingResult ?? null);
    setDecisionMap(snapshot?.matching?.decisions ?? {});
  }

  async function saveSession() {
    if (!importData && !invoiceImport && !preview && !matchingResult) {
      setStatus("Nessun dato da salvare.");
      return;
    }
    setIsSaving(true);
    const response = await saveReconciliationSession(buildSnapshot());
    setIsSaving(false);
    setStatus(
      response.warning
        ? `Salvato in locale (${fmtDateTime(response.savedAt)}). Firebase: ${response.warning}`
        : `Sessione salvata (${response.storage}) alle ${fmtDateTime(response.savedAt)}.`
    );
  }

  async function loadSession() {
    setIsLoadingSession(true);
    const payload = await loadLatestReconciliationSession();
    setIsLoadingSession(false);
    if (!payload?.snapshot) {
      setStatus("Nessuna sessione trovata.");
      return;
    }
    applySnapshot(payload.snapshot);
    setStatus(`Sessione caricata da ${payload.storage} (${fmtDateTime(payload.savedAt)}).`);
  }

  return (
    <main className="py-8 px-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-800">Liquidita e Prima Nota</h1>
          <p className="mt-2 text-sm text-slate-600">Salvataggio sessione e workflow conferma partite.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={saveSession} disabled={isSaving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400">
              {isSaving ? "Salvataggio..." : "Salva sessione"}
            </button>
            <button type="button" onClick={loadSession} disabled={isLoadingSession} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400">
              {isLoadingSession ? "Caricamento..." : "Carica ultima sessione"}
            </button>
            <button type="button" onClick={confirmAuto} disabled={!suggestions.length} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400">
              Conferma automatiche
            </button>
            <button type="button" onClick={resetDecisions} disabled={!suggestions.length} className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400">
              Reset decisioni
            </button>
          </div>
          {status ? <p className="mt-3 text-sm text-slate-700">{status}</p> : null}
          {suggestions.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">In attesa</p><p className="text-xl font-semibold text-slate-800">{decisionStats.pending}</p></div>
              <div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Confermate</p><p className="text-xl font-semibold text-emerald-900">{decisionStats.confirmed}</p></div>
              <div className="rounded-lg bg-rose-50 p-3"><p className="text-xs text-rose-700">Scartate</p><p className="text-xl font-semibold text-rose-900">{decisionStats.rejected}</p></div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Import estratto conto</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" type="file" accept=".csv,.txt,.tsv" onChange={onBankUpload} />
            <button type="button" onClick={generatePreview} disabled={!importData || !mapping} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400">Genera anteprima movimenti</button>
          </div>
          {isBankLoading ? <p className="mt-2 text-sm text-slate-600">Import estratto conto in corso...</p> : null}
          {bankError ? <p className="mt-2 text-sm text-red-600">{bankError}</p> : null}
          {importData ? <p className="mt-2 text-sm text-slate-600">File: {importData.fileName} | Delimitatore: {importData.delimiter === "\t" ? "TAB" : importData.delimiter}</p> : null}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Import XML Fatture Elettroniche</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-[220px_1fr]">
            <label className="text-sm text-slate-700">
              Tipo fatture
              <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)}>
                <option value="emessa">Emesse</option>
                <option value="ricevuta">Ricevute</option>
              </select>
            </label>
            <input className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" type="file" accept=".xml" multiple onChange={onInvoiceUpload} />
          </div>
          {isInvoiceLoading ? <p className="mt-2 text-sm text-slate-600">Import fatture in corso...</p> : null}
          {invoiceError ? <p className="mt-2 text-sm text-red-600">{invoiceError}</p> : null}
          {invoiceImport ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">File XML: <span className="font-semibold">{invoiceImport.stats.totalFiles}</span></div>
              <div className="rounded-lg bg-emerald-50 p-3">Importate: <span className="font-semibold">{invoiceImport.stats.importedFiles}</span></div>
              <div className="rounded-lg bg-amber-50 p-3">Con errori: <span className="font-semibold">{invoiceImport.stats.errorFiles}</span></div>
            </div>
          ) : null}
        </section>

        {importData && mapping ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Mapping colonne estratto conto</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {BANK_FIELDS.map((field) => (
                <label key={field.key} className="text-sm text-slate-700">
                  {field.label}
                  <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={mapping[field.key] ?? ""} onChange={(e) => setMapping((p) => ({ ...p, [field.key]: e.target.value || null }))}>
                    <option value="">-- Non mappato --</option>
                    {importData.headers.map((header) => <option key={`${field.key}_${header}`} value={header}>{header}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Matching e conferma</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">Tol. importo<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" type="number" min="0" step="0.01" value={matchingConfig.amountTolerance} onChange={(e) => setMatchingConfig((p) => ({ ...p, amountTolerance: Number(e.target.value) }))} /></label>
            <label className="text-sm">Tol. giorni<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" type="number" min="0" value={matchingConfig.maxDateDistanceDays} onChange={(e) => setMatchingConfig((p) => ({ ...p, maxDateDistanceDays: Number(e.target.value) }))} /></label>
            <label className="text-sm">Score minimo<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" type="number" min="0" max="100" value={matchingConfig.minScore} onChange={(e) => setMatchingConfig((p) => ({ ...p, minScore: Number(e.target.value) }))} /></label>
            <label className="text-sm">Score auto<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" type="number" min="0" max="100" value={matchingConfig.autoScore} onChange={(e) => setMatchingConfig((p) => ({ ...p, autoScore: Number(e.target.value) }))} /></label>
          </div>
          <button type="button" onClick={runMatching} disabled={!preview?.movements?.length || !invoiceImport?.invoices?.length} className="mt-4 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400">Genera suggerimenti matching</button>

          {preview ? <p className="mt-3 text-sm text-slate-600">Movimenti normalizzati: {preview.stats.importedRows}</p> : null}
          {invoiceImport ? <p className="text-sm text-slate-600">Fatture importate: {invoiceImport.stats.importedFiles}</p> : null}

          {suggestions.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Fattura</th>
                    <th className="px-3 py-2">Movimento</th>
                    <th className="px-3 py-2">CBI</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Proposta</th>
                    <th className="px-3 py-2">Decisione</th>
                    <th className="px-3 py-2">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{s.invoice.numero} ({eur.format(s.invoice.importoDaPagare)})</td>
                      <td className="px-3 py-2">{s.movement.bookingDate} ({eur.format(s.movement.amount)})</td>
                      <td className="px-3 py-2">{s.invoice.cbiCausale || "-"} / {s.movement.cbiCausale || "-"}</td>
                      <td className="px-3 py-2 font-semibold">{s.score}</td>
                      <td className="px-3 py-2">{s.type}</td>
                      <td className="px-3 py-2">{s.decision}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setDecision(s.id, "confirmed")} className="rounded bg-emerald-700 px-2 py-1 text-xs text-white">Conferma</button>
                          <button type="button" onClick={() => setDecision(s.id, "rejected")} className="rounded bg-rose-700 px-2 py-1 text-xs text-white">Scarta</button>
                          <button type="button" onClick={() => setDecision(s.id, "pending")} className="rounded bg-slate-500 px-2 py-1 text-xs text-white">Reset</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default LiquiditaPage;
