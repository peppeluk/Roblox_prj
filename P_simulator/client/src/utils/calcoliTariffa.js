export const IRPEF_SCAGLIONI_ATTUALI = [
  { finoA: 28000, aliquota: 23 },
  { finoA: 50000, aliquota: 33 },
  { finoA: Number.POSITIVE_INFINITY, aliquota: 43 }
];

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function clampPositive(value) {
  return Math.max(0, value);
}

export function calcolaIrpefProgressiva(imponibile, scaglioni = IRPEF_SCAGLIONI_ATTUALI) {
  const imponibilePulito = clampPositive(imponibile);
  let imposta = 0;
  let limiteInferiore = 0;
  const dettaglio = [];

  scaglioni.forEach((scaglione) => {
    const limiteSuperiore = scaglione.finoA;
    const imponibileScaglione =
      Math.max(0, Math.min(imponibilePulito, limiteSuperiore) - limiteInferiore);

    if (imponibileScaglione > 0) {
      const impostaScaglione = imponibileScaglione * (scaglione.aliquota / 100);
      imposta += impostaScaglione;
      dettaglio.push({
        limiteInferiore,
        limiteSuperiore,
        imponibileScaglione,
        aliquota: scaglione.aliquota,
        impostaScaglione
      });
    }

    limiteInferiore = limiteSuperiore;
  });

  return { imposta, dettaglio };
}

function calcolaScenarioAnnuale({
  fatturato,
  costiFissiAnnuali,
  costiVariabiliPercentuale,
  contributiPercentuale,
  regimeFiscale,
  aliquotaFlatTax,
  coefficienteRedditivita
}) {
  const costiVariabili = fatturato * (costiVariabiliPercentuale / 100);
  const contributi = fatturato * (contributiPercentuale / 100);

  if (regimeFiscale === "forfettario") {
    const imponibileFiscale = clampPositive(fatturato * (coefficienteRedditivita / 100) - contributi);
    const imposte = imponibileFiscale * (aliquotaFlatTax / 100);
    const nettoStimato = fatturato - costiFissiAnnuali - costiVariabili - contributi - imposte;

    return {
      costiVariabili,
      contributi,
      imponibileFiscale,
      imposte,
      nettoStimato,
      dettaglioIrpef: []
    };
  }

  const imponibileFiscale = clampPositive(fatturato - costiFissiAnnuali - costiVariabili - contributi);
  const { imposta, dettaglio } = calcolaIrpefProgressiva(imponibileFiscale);
  const nettoStimato = fatturato - costiFissiAnnuali - costiVariabili - contributi - imposta;

  return {
    costiVariabili,
    contributi,
    imponibileFiscale,
    imposte: imposta,
    nettoStimato,
    dettaglioIrpef: dettaglio
  };
}

export function calcolaTariffaMinima({
  redditoNettoAnnuale,
  costiFissiAnnuali,
  costiVariabiliPercentuale = 0,
  contributiPercentuale,
  oreSettimana,
  settimaneLavorative,
  regimeFiscale = "ordinario",
  aliquotaFlatTax = 15,
  coefficienteRedditivita = 67
}) {
  const numeriBase = [
    redditoNettoAnnuale,
    costiFissiAnnuali,
    costiVariabiliPercentuale,
    contributiPercentuale,
    oreSettimana,
    settimaneLavorative,
    aliquotaFlatTax,
    coefficienteRedditivita
  ];

  if (numeriBase.some((value) => !isFiniteNumber(value))) return null;
  if (redditoNettoAnnuale <= 0) return null;
  if (costiFissiAnnuali < 0) return null;
  if (oreSettimana <= 0 || settimaneLavorative <= 0) return null;
  if (contributiPercentuale < 0 || contributiPercentuale >= 100) return null;
  if (costiVariabiliPercentuale < 0 || costiVariabiliPercentuale >= 100) return null;

  if (regimeFiscale === "forfettario") {
    if (aliquotaFlatTax <= 0 || aliquotaFlatTax >= 100) return null;
    if (coefficienteRedditivita <= 0 || coefficienteRedditivita > 100) return null;
  }

  const oreTotali = oreSettimana * settimaneLavorative;
  if (oreTotali <= 0) return null;

  const scenarioArgs = {
    costiFissiAnnuali,
    costiVariabiliPercentuale,
    contributiPercentuale,
    regimeFiscale,
    aliquotaFlatTax,
    coefficienteRedditivita
  };

  let lowerBound = 0;
  let upperBound = Math.max(redditoNettoAnnuale + costiFissiAnnuali, 10000);
  let scenarioUpper = calcolaScenarioAnnuale({ fatturato: upperBound, ...scenarioArgs });
  let guard = 0;

  while (scenarioUpper.nettoStimato < redditoNettoAnnuale && guard < 80) {
    upperBound *= 1.6;
    scenarioUpper = calcolaScenarioAnnuale({ fatturato: upperBound, ...scenarioArgs });
    guard += 1;
  }

  if (scenarioUpper.nettoStimato < redditoNettoAnnuale) return null;

  for (let i = 0; i < 80; i += 1) {
    const mid = (lowerBound + upperBound) / 2;
    const scenarioMid = calcolaScenarioAnnuale({ fatturato: mid, ...scenarioArgs });
    if (scenarioMid.nettoStimato >= redditoNettoAnnuale) {
      upperBound = mid;
    } else {
      lowerBound = mid;
    }
  }

  const fatturatoMinimo = upperBound;
  const scenarioFinale = calcolaScenarioAnnuale({ fatturato: fatturatoMinimo, ...scenarioArgs });
  const tariffaOraria = fatturatoMinimo / oreTotali;

  return {
    fatturatoMinimo,
    oreTotali,
    tariffaOraria,
    nettoStimato: scenarioFinale.nettoStimato,
    costiFissiAnnuali,
    costiVariabili: scenarioFinale.costiVariabili,
    contributi: scenarioFinale.contributi,
    imponibileFiscale: scenarioFinale.imponibileFiscale,
    imposte: scenarioFinale.imposte,
    dettaglioIrpef: scenarioFinale.dettaglioIrpef,
    regimeFiscale,
    aliquotaFlatTax,
    coefficienteRedditivita
  };
}

export function simulaScenario({
  redditoNettoAnnuale,
  costiFissiAnnuali,
  costiVariabiliPercentuale = 0,
  contributiPercentuale,
  oreSettimana,
  settimaneLavorative,
  regimeFiscale = "ordinario",
  aliquotaFlatTax = 15,
  coefficienteRedditivita = 67,
  variazioneCosti = 0,
  variazioneOre = 0
}) {
  return calcolaTariffaMinima({
    redditoNettoAnnuale,
    costiFissiAnnuali: costiFissiAnnuali * (1 + variazioneCosti / 100),
    costiVariabiliPercentuale,
    contributiPercentuale,
    oreSettimana: oreSettimana * (1 - variazioneOre / 100),
    settimaneLavorative,
    regimeFiscale,
    aliquotaFlatTax,
    coefficienteRedditivita
  });
}
