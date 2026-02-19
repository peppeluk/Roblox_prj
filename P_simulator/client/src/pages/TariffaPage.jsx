import { useMemo, useState } from "react";
import RedditivitaTrendChart from "../components/RedditivitaTrendChart";
import {
  IRPEF_SCAGLIONI_ATTUALI,
  calcolaAnalisiRedditivita,
  calcolaTariffaMinima
} from "../utils/calcoliTariffa";
import { getAtecoPreset } from "../utils/tax/atecoProfiles";

const monthNames = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre"
];

const currentMonth = new Date().getMonth() + 1;

const initialForm = {
  regimeFiscale: "ordinario",
  codiceAteco: "62.01.00",
  redditoNettoAnnuale: 30000,
  costiFissiAnnuali: 10000,
  abilitaCostiVariabili: false,
  costiVariabiliPercentuale: 8,
  oreSettimana: 30,
  settimaneLavorative: 46,
  usaContributiManuali: false,
  contributiPercentualeManuale: 26.07,
  usaCoeffManuale: false,
  coefficienteRedditivitaManuale: 78,
  flatTaxStartUp: false,
  riduzioneContributiForfettario: false,
  abilitaAnalisiAttuale: true,
  tariffaRealeAttuale: 45,
  fatturatoYtd: 15000,
  oreFatturateYtd: 320,
  meseCorrente: currentMonth
};

const eur = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2
});

const number = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function readNumberInput(rawValue) {
  if (rawValue === "") return "";
  const parsed = Number(rawValue);
  return Number.isNaN(parsed) ? "" : parsed;
}

function formatPercent(value) {
  return `${number.format(value)}%`;
}

function formatSignedPercent(value) {
  if (!Number.isFinite(value)) return "n/d";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${number.format(value)}%`;
}

function formatScaglioneLabel(limiteInferiore, limiteSuperiore) {
  if (!Number.isFinite(limiteSuperiore)) {
    return `Oltre ${eur.format(limiteInferiore)}`;
  }

  return `${eur.format(limiteInferiore)} - ${eur.format(limiteSuperiore)}`;
}

const IRPEF_RIGHE = (() => {
  let limiteInferiore = 0;
  return IRPEF_SCAGLIONI_ATTUALI.map((scaglione) => {
    const riga = {
      limiteInferiore,
      limiteSuperiore: scaglione.finoA,
      aliquota: scaglione.aliquota
    };
    limiteInferiore = scaglione.finoA;
    return riga;
  });
})();

function FormField({ label, hint, className = "", children }) {
  return (
    <label className={`block rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 ${className}`}>
      <span className="block font-medium text-slate-800">{label}</span>
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
      <div className="mt-3">{children}</div>
    </label>
  );
}

function TariffaPage() {
  const [form, setForm] = useState(initialForm);

  const atecoPreset = useMemo(() => getAtecoPreset(form.codiceAteco), [form.codiceAteco]);

  const costiVariabiliPercentuale = form.abilitaCostiVariabili ? form.costiVariabiliPercentuale : 0;
  const contributiPercentualeBase = form.usaContributiManuali
    ? form.contributiPercentualeManuale
    : atecoPreset.contributiPercentuale;
  const riduzioneContributiApplicabile =
    form.regimeFiscale === "forfettario" && atecoPreset.profileKey !== "gestione-separata";
  const contributiPercentualeEffettiva =
    riduzioneContributiApplicabile && form.riduzioneContributiForfettario
      ? contributiPercentualeBase * 0.65
      : contributiPercentualeBase;
  const coefficienteRedditivita = form.usaCoeffManuale
    ? form.coefficienteRedditivitaManuale
    : atecoPreset.coefficienteRedditivita;
  const aliquotaFlatTax = form.flatTaxStartUp ? 5 : 15;

  const validationError = useMemo(() => {
    const checkFinite = (value) => Number.isFinite(value);

    if (!checkFinite(form.redditoNettoAnnuale) || form.redditoNettoAnnuale <= 0) {
      return "Inserisci un reddito netto annuo maggiore di zero.";
    }

    if (!checkFinite(form.costiFissiAnnuali) || form.costiFissiAnnuali < 0) {
      return "I costi fissi annui devono essere pari o maggiori di zero.";
    }

    if (!checkFinite(form.oreSettimana) || form.oreSettimana <= 0) {
      return "Le ore fatturabili a settimana devono essere maggiori di zero.";
    }

    if (!checkFinite(form.settimaneLavorative) || form.settimaneLavorative <= 0) {
      return "Le settimane lavorative devono essere maggiori di zero.";
    }

    if (!checkFinite(contributiPercentualeEffettiva) || contributiPercentualeEffettiva < 0 || contributiPercentualeEffettiva >= 100) {
      return "Aliquota contributi non valida. Usa un valore tra 0 e 99.99.";
    }

    if (form.abilitaCostiVariabili) {
      if (!checkFinite(form.costiVariabiliPercentuale) || form.costiVariabiliPercentuale < 0 || form.costiVariabiliPercentuale >= 100) {
        return "I costi variabili devono essere tra 0 e 99.99.";
      }
    }

    if (form.regimeFiscale === "forfettario") {
      if (!checkFinite(coefficienteRedditivita) || coefficienteRedditivita <= 0 || coefficienteRedditivita > 100) {
        return "Il coefficiente di redditivita deve essere tra 1 e 100.";
      }
    }

    return "";
  }, [
    form.redditoNettoAnnuale,
    form.costiFissiAnnuali,
    form.oreSettimana,
    form.settimaneLavorative,
    form.abilitaCostiVariabili,
    form.costiVariabiliPercentuale,
    form.regimeFiscale,
    contributiPercentualeEffettiva,
    coefficienteRedditivita
  ]);

  const analisiValidationError = useMemo(() => {
    if (!form.abilitaAnalisiAttuale) return "";

    if (!Number.isFinite(form.tariffaRealeAttuale) || form.tariffaRealeAttuale <= 0) {
      return "Inserisci una tariffa reale attuale maggiore di zero.";
    }

    if (!Number.isFinite(form.fatturatoYtd) || form.fatturatoYtd < 0) {
      return "Inserisci un fatturato YTD valido (>= 0).";
    }

    if (!Number.isFinite(form.oreFatturateYtd) || form.oreFatturateYtd < 0) {
      return "Inserisci ore fatturate YTD valide (>= 0).";
    }

    if (!Number.isFinite(form.meseCorrente) || form.meseCorrente < 1 || form.meseCorrente > 12) {
      return "Il mese corrente deve essere compreso tra 1 e 12.";
    }

    return "";
  }, [
    form.abilitaAnalisiAttuale,
    form.tariffaRealeAttuale,
    form.fatturatoYtd,
    form.oreFatturateYtd,
    form.meseCorrente
  ]);

  const risultato = useMemo(() => {
    if (validationError) return null;

    return calcolaTariffaMinima({
      redditoNettoAnnuale: form.redditoNettoAnnuale,
      costiFissiAnnuali: form.costiFissiAnnuali,
      costiVariabiliPercentuale,
      contributiPercentuale: contributiPercentualeEffettiva,
      oreSettimana: form.oreSettimana,
      settimaneLavorative: form.settimaneLavorative,
      regimeFiscale: form.regimeFiscale,
      aliquotaFlatTax,
      coefficienteRedditivita
    });
  }, [
    validationError,
    form.redditoNettoAnnuale,
    form.costiFissiAnnuali,
    form.oreSettimana,
    form.settimaneLavorative,
    form.regimeFiscale,
    costiVariabiliPercentuale,
    contributiPercentualeEffettiva,
    aliquotaFlatTax,
    coefficienteRedditivita
  ]);

  const analisiRedditivita = useMemo(() => {
    if (!form.abilitaAnalisiAttuale || validationError || analisiValidationError) return null;

    return calcolaAnalisiRedditivita({
      redditoNettoAnnuale: form.redditoNettoAnnuale,
      costiFissiAnnuali: form.costiFissiAnnuali,
      costiVariabiliPercentuale,
      contributiPercentuale: contributiPercentualeEffettiva,
      oreSettimana: form.oreSettimana,
      settimaneLavorative: form.settimaneLavorative,
      regimeFiscale: form.regimeFiscale,
      aliquotaFlatTax,
      coefficienteRedditivita,
      tariffaRealeAttuale: form.tariffaRealeAttuale,
      fatturatoYtd: form.fatturatoYtd,
      oreFatturateYtd: form.oreFatturateYtd,
      meseCorrente: form.meseCorrente
    });
  }, [
    form.abilitaAnalisiAttuale,
    validationError,
    analisiValidationError,
    form.redditoNettoAnnuale,
    form.costiFissiAnnuali,
    form.oreSettimana,
    form.settimaneLavorative,
    form.regimeFiscale,
    form.tariffaRealeAttuale,
    form.fatturatoYtd,
    form.oreFatturateYtd,
    form.meseCorrente,
    costiVariabiliPercentuale,
    contributiPercentualeEffettiva,
    aliquotaFlatTax,
    coefficienteRedditivita
  ]);

  function handleNumberChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: readNumberInput(value)
    }));
  }

  function handleTextChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function handleBooleanChange(event) {
    const { name, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: checked
    }));
  }

  function setRegime(regimeFiscale) {
    setForm((prev) => ({
      ...prev,
      regimeFiscale
    }));
  }

  return (
    <main className="py-8 px-4">
      <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-slate-800">Tariffa Minima</h1>
        <p className="mt-2 text-sm text-slate-600">
          Simulazione tariffa oraria con costi variabili, contributi da ATECO e tassazione ordinaria o
          forfettaria.
        </p>
        <p className="mt-2 text-xs text-amber-700">
          Stima operativa: i valori fiscali/previdenziali possono variare per casistiche individuali.
        </p>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <FormField
            label="Reddito netto annuo desiderato"
            hint="Inserisci il reddito netto che vuoi ottenere a fine anno."
          >
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
              name="redditoNettoAnnuale"
              type="number"
              value={form.redditoNettoAnnuale}
              onChange={handleNumberChange}
              min="1"
              step="100"
            />
          </FormField>

          <FormField
            label="Codice ATECO"
            hint="Usato per suggerire profilo contributivo e coefficiente forfettario."
          >
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
              name="codiceAteco"
              type="text"
              value={form.codiceAteco}
              onChange={handleTextChange}
              placeholder="Es. 62.01.00"
            />
            <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
              <p>
                Profilo suggerito: <span className="font-medium text-slate-800">{atecoPreset.profileLabel}</span>
              </p>
              <p>Contributi base: {formatPercent(atecoPreset.contributiPercentuale)}</p>
              <p>Coeff. redditivita forfettario: {formatPercent(atecoPreset.coefficienteRedditivita)}</p>
              <p className="mt-1 text-slate-500">{atecoPreset.note}</p>
            </div>
          </FormField>

          <FormField
            label="Regime fiscale"
            hint="Ordinario: IRPEF a scaglioni. Forfettario: imposta sostitutiva (flat tax)."
          >
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-200 p-1">
              <button
                type="button"
                onClick={() => setRegime("ordinario")}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  form.regimeFiscale === "ordinario"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                Ordinario
              </button>
              <button
                type="button"
                onClick={() => setRegime("forfettario")}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  form.regimeFiscale === "forfettario"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                Forfettario
              </button>
            </div>
          </FormField>

          <FormField
            label="Costi fissi annui"
            hint="Affitto, software, consulenze, assicurazioni, attrezzature ricorrenti."
          >
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
              name="costiFissiAnnuali"
              type="number"
              value={form.costiFissiAnnuali}
              onChange={handleNumberChange}
              min="0"
              step="100"
            />
          </FormField>

          <FormField
            label="Ore fatturabili a settimana"
            hint="Inserisci solo ore vendibili al cliente, non ore amministrative."
          >
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
              name="oreSettimana"
              type="number"
              value={form.oreSettimana}
              onChange={handleNumberChange}
              min="1"
              step="0.5"
            />
          </FormField>

          <FormField
            label="Settimane lavorative annue"
            hint="Escludi ferie, festivita, periodi non fatturabili."
          >
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
              name="settimaneLavorative"
              type="number"
              value={form.settimaneLavorative}
              onChange={handleNumberChange}
              min="1"
              step="1"
            />
          </FormField>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Costi Variabili</h2>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="abilitaCostiVariabili"
                checked={form.abilitaCostiVariabili}
                onChange={handleBooleanChange}
              />
              Includi costi variabili sul fatturato
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Utile se hai fee, collaboratori o costi che crescono quando aumenta il fatturato.
            </p>
            {form.abilitaCostiVariabili ? (
              <div className="mt-3">
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                  name="costiVariabiliPercentuale"
                  type="number"
                  value={form.costiVariabiliPercentuale}
                  onChange={handleNumberChange}
                  min="0"
                  max="99.99"
                  step="0.1"
                />
                <p className="mt-1 text-xs text-slate-500">Percentuale costi variabili sul fatturato annuo.</p>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Contributi Previdenziali</h2>
            <p className="mt-2 text-xs text-slate-600">
              Aliquota effettiva usata nel calcolo:{" "}
              <span className="font-semibold text-slate-800">{formatPercent(contributiPercentualeEffettiva)}</span>
            </p>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="usaContributiManuali"
                checked={form.usaContributiManuali}
                onChange={handleBooleanChange}
              />
              Sovrascrivi aliquota contributi
            </label>
            {form.usaContributiManuali ? (
              <div className="mt-3">
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                  name="contributiPercentualeManuale"
                  type="number"
                  value={form.contributiPercentualeManuale}
                  onChange={handleNumberChange}
                  min="0"
                  max="99.99"
                  step="0.01"
                />
              </div>
            ) : null}
            {riduzioneContributiApplicabile ? (
              <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="riduzioneContributiForfettario"
                  checked={form.riduzioneContributiForfettario}
                  onChange={handleBooleanChange}
                />
                <span>
                  Applica riduzione contributiva forfettario (-35%) su artigiani/commercianti.
                </span>
              </label>
            ) : null}
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Imposte</h2>
          {form.regimeFiscale === "ordinario" ? (
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>Scaglioni IRPEF usati nel calcolo (aggiornati dal 2025):</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {IRPEF_RIGHE.map((scaglione) => (
                  <div key={`${scaglione.limiteSuperiore}_${scaglione.aliquota}`} className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs text-slate-500">
                      {formatScaglioneLabel(scaglione.limiteInferiore, scaglione.limiteSuperiore)}
                    </p>
                    <p className="font-semibold text-slate-900">{formatPercent(scaglione.aliquota)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="flatTaxStartUp"
                  checked={form.flatTaxStartUp}
                  onChange={handleBooleanChange}
                />
                Applica flat tax start-up al 5% (se requisiti rispettati)
              </label>
              <p>
                Aliquota flat tax usata:{" "}
                <span className="font-semibold text-slate-900">{formatPercent(aliquotaFlatTax)}</span>
              </p>
              <p>
                Coefficiente redditivita:{" "}
                <span className="font-semibold text-slate-900">{formatPercent(coefficienteRedditivita)}</span>
              </p>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="usaCoeffManuale"
                  checked={form.usaCoeffManuale}
                  onChange={handleBooleanChange}
                />
                Sovrascrivi coefficiente redditivita
              </label>
              {form.usaCoeffManuale ? (
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                  name="coefficienteRedditivitaManuale"
                  type="number"
                  value={form.coefficienteRedditivitaManuale}
                  onChange={handleNumberChange}
                  min="1"
                  max="100"
                  step="0.1"
                />
              ) : null}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-xl bg-slate-900 p-4 text-slate-100">
          {!risultato || validationError ? (
            <p className="text-sm text-rose-300">
              {validationError || "Inserisci valori validi per ottenere una simulazione."}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-300">Fatturato minimo</p>
                  <p className="text-lg font-semibold">{eur.format(risultato.fatturatoMinimo)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-300">Tariffa oraria minima</p>
                  <p className="text-lg font-semibold">{eur.format(risultato.tariffaOraria)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-300">Ore fatturabili annue</p>
                  <p className="text-lg font-semibold">{Math.round(risultato.oreTotali)}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-300">Costi fissi</p>
                  <p className="text-base font-semibold">{eur.format(risultato.costiFissiAnnuali)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-300">Costi variabili</p>
                  <p className="text-base font-semibold">{eur.format(risultato.costiVariabili)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-300">Contributi</p>
                  <p className="text-base font-semibold">{eur.format(risultato.contributi)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-300">Imposte</p>
                  <p className="text-base font-semibold">{eur.format(risultato.imposte)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-300">Imponibile fiscale</p>
                <p className="text-base font-semibold">{eur.format(risultato.imponibileFiscale)}</p>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-300">Netto annuo stimato</p>
                <p className="mt-1 text-xl font-semibold text-emerald-300">{eur.format(risultato.nettoStimato)}</p>
              </div>

              {form.regimeFiscale === "ordinario" && risultato.dettaglioIrpef.length ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-300">Dettaglio IRPEF per scaglione</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {risultato.dettaglioIrpef.map((riga) => (
                      <div
                        key={`${riga.limiteInferiore}_${riga.limiteSuperiore}_${riga.aliquota}`}
                        className="rounded-md border border-slate-700 bg-slate-800 p-2 text-xs text-slate-200"
                      >
                        <p>{formatScaglioneLabel(riga.limiteInferiore, riga.limiteSuperiore)}</p>
                        <p>Aliquota: {formatPercent(riga.aliquota)}</p>
                        <p>Imposta: {eur.format(riga.impostaScaglione)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {form.regimeFiscale === "forfettario" && risultato.fatturatoMinimo > 85000 ? (
                <p className="text-xs text-amber-300">
                  Attenzione: il fatturato stimato supera 85.000 EUR, soglia tipica del regime forfettario.
                </p>
              ) : null}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                Analisi Situazione Attuale
              </h2>
              <p className="text-xs text-slate-500">
                Inserisci andamento reale dell'anno per stimare il gap e le azioni di recupero.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="abilitaAnalisiAttuale"
                checked={form.abilitaAnalisiAttuale}
                onChange={handleBooleanChange}
              />
              Attiva analisi gap
            </label>
          </div>

          {form.abilitaAnalisiAttuale ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <FormField
                label="Tariffa reale attuale (EUR/h)"
                hint="Tariffa media effettiva che stai applicando oggi."
              >
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                  name="tariffaRealeAttuale"
                  type="number"
                  value={form.tariffaRealeAttuale}
                  onChange={handleNumberChange}
                  min="0.01"
                  step="0.5"
                />
              </FormField>

              <FormField
                label="Fatturato YTD (EUR)"
                hint="Fatturato dall'inizio dell'anno al mese corrente."
              >
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                  name="fatturatoYtd"
                  type="number"
                  value={form.fatturatoYtd}
                  onChange={handleNumberChange}
                  min="0"
                  step="100"
                />
              </FormField>

              <FormField
                label="Ore fatturate YTD"
                hint="Se inserite, migliorano la stima della tariffa media effettiva."
              >
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                  name="oreFatturateYtd"
                  type="number"
                  value={form.oreFatturateYtd}
                  onChange={handleNumberChange}
                  min="0"
                  step="1"
                />
              </FormField>

              <FormField
                label="Mese corrente"
                hint="Serve a calcolare la frazione di anno trascorsa."
              >
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-slate-500 focus:outline-none"
                  name="meseCorrente"
                  value={form.meseCorrente}
                  onChange={handleNumberChange}
                >
                  {monthNames.map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          ) : null}

          {analisiValidationError ? (
            <p className="mt-4 text-sm text-rose-600">{analisiValidationError}</p>
          ) : null}

          {form.abilitaAnalisiAttuale && analisiRedditivita ? (
            <div className="mt-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Proiezione fatturato fine anno</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {eur.format(analisiRedditivita.fatturatoStimatoFineAnno)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Proiezione netto fine anno</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {eur.format(analisiRedditivita.nettoProiettatoFineAnno)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Gap netto vs target</p>
                  <p
                    className={`mt-1 text-lg font-semibold ${
                      analisiRedditivita.gapNetto <= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {eur.format(analisiRedditivita.gapNetto)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Ricavi residui necessari</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {eur.format(analisiRedditivita.ricaviResiduiNecessari)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Trend Fatturato (Target vs Reale)</p>
                <p className="mt-1 text-xs text-slate-500">
                  Scostamento YTD rispetto al target teorico:{" "}
                  <span
                    className={
                      analisiRedditivita.scostamentoYtd >= 0
                        ? "font-semibold text-emerald-700"
                        : "font-semibold text-rose-700"
                    }
                  >
                    {eur.format(analisiRedditivita.scostamentoYtd)}
                  </span>
                </p>
                <div className="mt-3">
                  <RedditivitaTrendChart
                    labels={analisiRedditivita.trend.labels}
                    targetSeries={analisiRedditivita.trend.targetSeries}
                    projectedSeries={analisiRedditivita.trend.projectedSeries}
                    actualSeries={analisiRedditivita.trend.actualSeries}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                  Suggerimento AI (beta)
                </p>
                <h3 className="mt-1 text-base font-semibold text-indigo-900">
                  {analisiRedditivita.strategiaConsigliata.titolo}
                </h3>
                <p className="mt-1 text-sm text-indigo-900">
                  {analisiRedditivita.strategiaConsigliata.descrizione}
                </p>
                {analisiRedditivita.strategiaConsigliata.azioni ? (
                  <div className="mt-3 space-y-1 text-sm text-indigo-900">
                    {analisiRedditivita.strategiaConsigliata.azioni.map((azione) => (
                      <p key={azione}>- {azione}</p>
                    ))}
                  </div>
                ) : null}
                <p className="mt-3 text-xs text-indigo-700">
                  Nota: il suggerimento AI e un supporto operativo, non sostituisce consulenza
                  fiscale/professionale.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                {analisiRedditivita.strategie.map((strategia) => (
                  <div key={strategia.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-900">{strategia.titolo}</p>
                    {strategia.fattibile ? (
                      <div className="mt-2 text-xs text-slate-600">
                        <p>Tariffa: {eur.format(strategia.tariffaTarget)}</p>
                        <p>Ore/settimana: {number.format(strategia.oreSettimanaliTarget)}</p>
                        <p>Delta tariffa: {formatSignedPercent(strategia.deltaTariffaPercent)}</p>
                        <p>Delta ore: {formatSignedPercent(strategia.deltaOrePercent)}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-rose-600">
                        Strategia non fattibile con i vincoli correnti.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default TariffaPage;
