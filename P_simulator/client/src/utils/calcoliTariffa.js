// Calcolo tariffa minima sostenibile
export function calcolaTariffaMinima({
  redditoNettoAnnuale,
  costiFissiAnnuali,
  contributiPercentuale,
  oreSettimana,
  settimaneLavorative
}) {
  // Calcolo fatturato minimo
  const fatturatoMinimo =
    (redditoNettoAnnuale + costiFissiAnnuali) / (1 - contributiPercentuale / 100);

  // Ore totali lavorabili
  const oreTotali = oreSettimana * settimaneLavorative;

  // Tariffa oraria minima
  const tariffaOraria = fatturatoMinimo / oreTotali;

  return { fatturatoMinimo, oreTotali, tariffaOraria };
}

// Simulazioni scenario
export function simulaScenario({
  redditoNettoAnnuale,
  costiFissiAnnuali,
  contributiPercentuale,
  oreSettimana,
  settimaneLavorative,
  variazioneCosti = 0,
  variazioneOre = 0
}) {
  const costiAggiornati = costiFissiAnnuali * (1 + variazioneCosti / 100);
  const oreAggiornate = oreSettimana * (1 - variazioneOre / 100);

  const { fatturatoMinimo } = calcolaTariffaMinima({
    redditoNettoAnnuale,
    costiFissiAnnuali: costiAggiornati,
    contributiPercentuale,
    oreSettimana: oreAggiornate,
    settimaneLavorative
  });

  return { fatturatoMinimo, oreAggiornate };
}
