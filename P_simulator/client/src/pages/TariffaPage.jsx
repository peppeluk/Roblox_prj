import { useMemo, useState } from "react";
import { calcolaTariffaMinima } from "../utils/calcoliTariffa";

const initialForm = {
  redditoNettoAnnuale: 30000,
  costiFissiAnnuali: 10000,
  contributiPercentuale: 25,
  oreSettimana: 30,
  settimaneLavorative: 46
};

function TariffaPage() {
  const [form, setForm] = useState(initialForm);

  const risultato = useMemo(() => {
    const valori = Object.values(form);
    const hasInvalid = valori.some((value) => Number.isNaN(value) || value <= 0);
    if (hasInvalid) return null;
    if (form.contributiPercentuale >= 100) return null;

    return calcolaTariffaMinima(form);
  }, [form]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: Number(value)
    }));
  }

  return (
    <main className="py-8 px-4">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-slate-800">Tariffa Minima</h1>
        <p className="mt-2 text-sm text-slate-600">
          Calcolo rapido della tariffa oraria minima sostenibile.
        </p>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-700">
            Reddito netto annuo
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
              name="redditoNettoAnnuale"
              type="number"
              value={form.redditoNettoAnnuale}
              onChange={handleChange}
            />
          </label>

          <label className="text-sm text-slate-700">
            Costi fissi annui
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
              name="costiFissiAnnuali"
              type="number"
              value={form.costiFissiAnnuali}
              onChange={handleChange}
            />
          </label>

          <label className="text-sm text-slate-700">
            Contributi %
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
              name="contributiPercentuale"
              type="number"
              value={form.contributiPercentuale}
              onChange={handleChange}
            />
          </label>

          <label className="text-sm text-slate-700">
            Ore settimana
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
              name="oreSettimana"
              type="number"
              value={form.oreSettimana}
              onChange={handleChange}
            />
          </label>

          <label className="text-sm text-slate-700 sm:col-span-2">
            Settimane lavorative
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
              name="settimaneLavorative"
              type="number"
              value={form.settimaneLavorative}
              onChange={handleChange}
            />
          </label>
        </section>

        <section className="mt-6 rounded-xl bg-slate-50 p-4">
          {!risultato ? (
            <p className="text-sm text-red-600">
              Inserisci valori validi (tutti &gt; 0 e contributi &lt; 100).
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Fatturato minimo</p>
                <p className="text-lg font-semibold text-slate-800">
                  {risultato.fatturatoMinimo.toFixed(2)} EUR
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Ore totali</p>
                <p className="text-lg font-semibold text-slate-800">{risultato.oreTotali.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Tariffa oraria</p>
                <p className="text-lg font-semibold text-slate-800">
                  {risultato.tariffaOraria.toFixed(2)} EUR/h
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default TariffaPage;
