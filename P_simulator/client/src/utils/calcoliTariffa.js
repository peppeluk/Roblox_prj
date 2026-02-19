export const IRPEF_SCAGLIONI_ATTUALI = [
  { finoA: 28000, aliquota: 23 },
  { finoA: 50000, aliquota: 33 },
  { finoA: Number.POSITIVE_INFINITY, aliquota: 43 }
];

const MONTH_LABELS = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic"
];

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function clampPositive(value) {
  return Math.max(0, value);
}

function safePercentDelta(target, current) {
  if (!isFiniteNumber(target) || !isFiniteNumber(current) || current <= 0) return Number.POSITIVE_INFINITY;
  return ((target - current) / current) * 100;
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

function trovaFatturatoMinimoPerNetto({ nettoTarget, scenarioArgs }) {
  if (!isFiniteNumber(nettoTarget)) return null;

  let lowerBound = 0;
  let upperBound = Math.max(nettoTarget + scenarioArgs.costiFissiAnnuali, 10000);
  let scenarioUpper = calcolaScenarioAnnuale({ fatturato: upperBound, ...scenarioArgs });
  let guard = 0;

  while (scenarioUpper.nettoStimato < nettoTarget && guard < 80) {
    upperBound *= 1.6;
    scenarioUpper = calcolaScenarioAnnuale({ fatturato: upperBound, ...scenarioArgs });
    guard += 1;
  }

  if (scenarioUpper.nettoStimato < nettoTarget) return null;

  for (let i = 0; i < 80; i += 1) {
    const mid = (lowerBound + upperBound) / 2;
    const scenarioMid = calcolaScenarioAnnuale({ fatturato: mid, ...scenarioArgs });
    if (scenarioMid.nettoStimato >= nettoTarget) {
      upperBound = mid;
    } else {
      lowerBound = mid;
    }
  }

  return upperBound;
}

function creaStrategia({
  id,
  titolo,
  tariffaTarget,
  oreSettimanaliTarget,
  tariffaCorrente,
  oreSettimanaliCorrenti
}) {
  const deltaTariffaPercent = safePercentDelta(tariffaTarget, tariffaCorrente);
  const deltaOrePercent = safePercentDelta(oreSettimanaliTarget, oreSettimanaliCorrenti);
  const hasFiniteValues = [tariffaTarget, oreSettimanaliTarget, deltaTariffaPercent, deltaOrePercent].every(
    (value) => isFiniteNumber(value) && value >= 0
  );

  if (!hasFiniteValues) {
    return {
      id,
      titolo,
      fattibile: false,
      score: Number.POSITIVE_INFINITY,
      tariffaTarget: 0,
      oreSettimanaliTarget: 0,
      deltaTariffaPercent: Number.POSITIVE_INFINITY,
      deltaOrePercent: Number.POSITIVE_INFINITY
    };
  }

  let score = Math.abs(deltaTariffaPercent) + Math.abs(deltaOrePercent);
  if (oreSettimanaliTarget > 50) score += (oreSettimanaliTarget - 50) * 3;
  if (deltaTariffaPercent > 40) score += (deltaTariffaPercent - 40) * 1.5;

  return {
    id,
    titolo,
    fattibile: true,
    score,
    tariffaTarget,
    oreSettimanaliTarget,
    deltaTariffaPercent,
    deltaOrePercent
  };
}

function suggerisciStrategia(strategie, ricaviResiduiNecessari, settimaneResidue) {
  if (ricaviResiduiNecessari <= 0) {
    return {
      id: "on-track",
      titolo: "Andamento in linea con il target",
      descrizione:
        "Con i dati correnti la proiezione chiude l'anno almeno al netto obiettivo. Mantieni controllo su costi e tariffa media.",
      fattibile: true,
      azioni: [
        "Monitora il delta mese su mese",
        "Difendi la tariffa media attuale",
        "Riduci i costi variabili quando possibile"
      ]
    };
  }

  if (settimaneResidue <= 0) {
    return {
      id: "year-end",
      titolo: "Fine anno raggiunta",
      descrizione:
        "Non ci sono settimane residue per recuperare il gap nel periodo selezionato. Usa la simulazione per pianificare il nuovo anno.",
      fattibile: false,
      azioni: ["Rivedi target annuo", "Pianifica nuova tariffa di partenza", "Riduci costi strutturali"]
    };
  }

  const fattibili = strategie.filter((s) => s.fattibile);
  if (!fattibili.length) {
    return {
      id: "no-feasible",
      titolo: "Scenario non sostenibile",
      descrizione:
        "Con i vincoli attuali non emerge una strategia numericamente sostenibile. Serve intervenire su piu leve contemporaneamente.",
      fattibile: false,
      azioni: [
        "Aumenta tariffa e ore insieme",
        "Rinegozia costi fissi/variabili",
        "Rivedi il netto target per il periodo"
      ]
    };
  }

  const migliore = fattibili.reduce((best, current) => (current.score < best.score ? current : best), fattibili[0]);
  const azioni = [
    `Tariffa target: ${migliore.tariffaTarget.toFixed(2)} EUR/h (${migliore.deltaTariffaPercent >= 0 ? "+" : ""}${migliore.deltaTariffaPercent.toFixed(1)}%)`,
    `Ore settimanali target: ${migliore.oreSettimanaliTarget.toFixed(1)} (${migliore.deltaOrePercent >= 0 ? "+" : ""}${migliore.deltaOrePercent.toFixed(1)}%)`,
    "Verifica impatto ogni mese rispetto al piano"
  ];

  return {
    ...migliore,
    descrizione:
      migliore.id === "mix"
        ? "Distribuire l'aggiustamento tra tariffa e ore riduce il rischio operativo rispetto a una sola leva."
        : migliore.id === "tariffa-only"
          ? "Intervenire solo sulla tariffa minimizza il carico ore ma richiede tenuta commerciale."
          : "Intervenire solo sulle ore evita aumenti tariffari ma puo aumentare il rischio di saturazione.",
    azioni
  };
}

function costruisciTrend({
  meseCorrente,
  fatturatoYtd,
  fatturatoTargetFineAnno,
  fatturatoStimatoFineAnno
}) {
  const labels = [...MONTH_LABELS];
  const targetSeries = labels.map((_, index) => (fatturatoTargetFineAnno * (index + 1)) / 12);
  const projectedSeries = labels.map((_, index) => (fatturatoStimatoFineAnno * (index + 1)) / 12);
  const actualSeries = labels.map((_, index) =>
    index + 1 <= meseCorrente ? (fatturatoYtd * (index + 1)) / meseCorrente : null
  );

  return { labels, targetSeries, projectedSeries, actualSeries };
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

  const fatturatoMinimo = trovaFatturatoMinimoPerNetto({
    nettoTarget: redditoNettoAnnuale,
    scenarioArgs
  });
  if (!isFiniteNumber(fatturatoMinimo)) return null;

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

export function calcolaAnalisiRedditivita({
  redditoNettoAnnuale,
  costiFissiAnnuali,
  costiVariabiliPercentuale = 0,
  contributiPercentuale,
  oreSettimana,
  settimaneLavorative,
  regimeFiscale = "ordinario",
  aliquotaFlatTax = 15,
  coefficienteRedditivita = 67,
  tariffaRealeAttuale,
  fatturatoYtd,
  oreFatturateYtd = 0,
  meseCorrente
}) {
  const numeriBase = [
    redditoNettoAnnuale,
    costiFissiAnnuali,
    costiVariabiliPercentuale,
    contributiPercentuale,
    oreSettimana,
    settimaneLavorative,
    aliquotaFlatTax,
    coefficienteRedditivita,
    tariffaRealeAttuale,
    fatturatoYtd,
    oreFatturateYtd,
    meseCorrente
  ];

  if (numeriBase.some((value) => !isFiniteNumber(value))) return null;
  if (redditoNettoAnnuale <= 0) return null;
  if (costiFissiAnnuali < 0) return null;
  if (contributiPercentuale < 0 || contributiPercentuale >= 100) return null;
  if (costiVariabiliPercentuale < 0 || costiVariabiliPercentuale >= 100) return null;
  if (oreSettimana <= 0 || settimaneLavorative <= 0) return null;
  if (tariffaRealeAttuale <= 0 || fatturatoYtd < 0 || oreFatturateYtd < 0) return null;

  const meseRound = Math.max(1, Math.min(12, Math.round(meseCorrente)));
  const frazioneAnnoPassata = meseRound / 12;
  const frazioneAnnoResidua = Math.max(0, 1 - frazioneAnnoPassata);
  const settimaneResidue = settimaneLavorative * frazioneAnnoResidua;

  const scenarioArgs = {
    costiFissiAnnuali,
    costiVariabiliPercentuale,
    contributiPercentuale,
    regimeFiscale,
    aliquotaFlatTax,
    coefficienteRedditivita
  };

  const fatturatoTargetFineAnno = trovaFatturatoMinimoPerNetto({
    nettoTarget: redditoNettoAnnuale,
    scenarioArgs
  });
  if (!isFiniteNumber(fatturatoTargetFineAnno)) return null;

  const fatturatoStimatoFineAnno = fatturatoYtd / frazioneAnnoPassata;
  const scenarioProiezione = calcolaScenarioAnnuale({
    fatturato: fatturatoStimatoFineAnno,
    ...scenarioArgs
  });
  const gapNetto = redditoNettoAnnuale - scenarioProiezione.nettoStimato;

  const ricaviResiduiNecessari = Math.max(0, fatturatoTargetFineAnno - fatturatoYtd);
  const ricaviSettimanaliNecessari = settimaneResidue > 0 ? ricaviResiduiNecessari / settimaneResidue : 0;
  const oreSettimanaliNecessarieDaOggi =
    settimaneResidue > 0 && tariffaRealeAttuale > 0
      ? ricaviResiduiNecessari / (settimaneResidue * tariffaRealeAttuale)
      : Number.POSITIVE_INFINITY;
  const oreTotaliNecessarieDaOggi =
    tariffaRealeAttuale > 0 ? ricaviResiduiNecessari / tariffaRealeAttuale : Number.POSITIVE_INFINITY;
  const tariffaNecessariaDaOggi =
    settimaneResidue > 0 && oreSettimana > 0
      ? ricaviResiduiNecessari / (settimaneResidue * oreSettimana)
      : Number.POSITIVE_INFINITY;

  const ricaviSettimanaliAttuali = tariffaRealeAttuale * oreSettimana;
  const fattoreRichiesto =
    settimaneResidue > 0 && ricaviSettimanaliAttuali > 0
      ? ricaviSettimanaliNecessari / ricaviSettimanaliAttuali
      : Number.POSITIVE_INFINITY;
  const fattoreMix =
    isFiniteNumber(fattoreRichiesto) && fattoreRichiesto > 0
      ? Math.sqrt(fattoreRichiesto)
      : Number.POSITIVE_INFINITY;

  const strategie = [
    creaStrategia({
      id: "tariffa-only",
      titolo: "Aumenta tariffa",
      tariffaTarget: tariffaNecessariaDaOggi,
      oreSettimanaliTarget: oreSettimana,
      tariffaCorrente: tariffaRealeAttuale,
      oreSettimanaliCorrenti: oreSettimana
    }),
    creaStrategia({
      id: "hours-only",
      titolo: "Aumenta ore",
      tariffaTarget: tariffaRealeAttuale,
      oreSettimanaliTarget: oreSettimanaliNecessarieDaOggi,
      tariffaCorrente: tariffaRealeAttuale,
      oreSettimanaliCorrenti: oreSettimana
    }),
    creaStrategia({
      id: "mix",
      titolo: "Bilancia tariffa e ore",
      tariffaTarget: tariffaRealeAttuale * fattoreMix,
      oreSettimanaliTarget: oreSettimana * fattoreMix,
      tariffaCorrente: tariffaRealeAttuale,
      oreSettimanaliCorrenti: oreSettimana
    })
  ];

  const strategiaConsigliata = suggerisciStrategia(strategie, ricaviResiduiNecessari, settimaneResidue);
  const targetYtdTeorico = fatturatoTargetFineAnno * frazioneAnnoPassata;
  const scostamentoYtd = fatturatoYtd - targetYtdTeorico;

  return {
    meseCorrente: meseRound,
    frazioneAnnoPassata,
    frazioneAnnoResidua,
    settimaneResidue,
    fatturatoYtd,
    fatturatoTargetFineAnno,
    fatturatoStimatoFineAnno,
    nettoProiettatoFineAnno: scenarioProiezione.nettoStimato,
    gapNetto,
    ricaviResiduiNecessari,
    ricaviSettimanaliNecessari,
    tariffaCorrenteEffettiva: oreFatturateYtd > 0 ? fatturatoYtd / oreFatturateYtd : tariffaRealeAttuale,
    tariffaNecessariaDaOggi,
    oreSettimanaliNecessarieDaOggi,
    oreTotaliNecessarieDaOggi,
    scostamentoYtd,
    strategiaConsigliata,
    strategie,
    trend: costruisciTrend({
      meseCorrente: meseRound,
      fatturatoYtd,
      fatturatoTargetFineAnno,
      fatturatoStimatoFineAnno
    })
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
