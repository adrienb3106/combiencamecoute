const modules = import.meta.glob('@/data/*/fiscal.json', { eager: true })

function getFiscal(annee) {
  const key = `/src/data/${annee}/fiscal.json`
  const mod = modules[key]
  if (!mod) throw new Error(`Pas de données fiscales pour ${annee}`)
  return mod.default ?? mod
}

// ── Abattement salarial ──────────────────────────────────────────
function abattementSalaire(salaireNet, fraisReels, fiscal) {
  if (fraisReels !== null && fraisReels !== undefined) return fraisReels
  const { taux, min, max } = fiscal.abattement_salaire
  return Math.min(Math.max(salaireNet * taux, min), max)
}

// ── Salaire net imposable d'un déclarant ─────────────────────────
function salaireNetImposable(declarant, fiscal) {
  const { statut, salaireBrut, fraisReels } = declarant
  const facteur = fiscal.facteurs_brut[statut] ?? fiscal.facteurs_brut.salarie
  const salaireNet = salaireBrut * facteur
  const abattement = abattementSalaire(salaireNet, fraisReels, fiscal)
  return Math.max(0, salaireNet - abattement)
}

// ── Cotisations d'un déclarant ───────────────────────────────────
function cotisationsDeclarant(declarant, fiscal) {
  const { statut, salaireBrut } = declarant
  const taux = fiscal.cotisations[statut] ?? fiscal.cotisations.salarie
  return Math.round(salaireBrut * taux)
}

// ── Calcul IR ────────────────────────────────────────────────────
function appliquerBareme(revenuImposable, nbParts, fiscal) {
  const quotient = revenuImposable / nbParts
  let impotParPart = 0
  for (const t of fiscal.ir.tranches) {
    const max = t.max ?? Infinity
    if (quotient <= t.min) break
    const base = Math.min(quotient, max) - t.min
    impotParPart += base * t.taux
  }
  return Math.max(0, Math.round(impotParPart * nbParts))
}

function reductionDons(dons, fiscal) {
  if (!dons?.length) return 0
  return Math.round(dons.reduce((acc, d) => {
    const taux = fiscal.deductions.dons[d.type] ?? fiscal.deductions.dons.standard
    return acc + d.montant * taux
  }, 0))
}

// ── Mode simplifié ───────────────────────────────────────────────
export function calculerPrelevementsSimple(rfr, nbParts, statut, annee) {
  const fiscal = getFiscal(annee)
  const ir = appliquerBareme(rfr, nbParts, fiscal)
  const brut = rfr / (fiscal.facteurs_brut[statut] ?? fiscal.facteurs_brut.salarie)
  const cotisations = Math.round(brut * (fiscal.cotisations[statut] ?? fiscal.cotisations.salarie))
  return { ir, cotisations, total: ir + cotisations, parDeclarant: null }
}

// ── Mode avancé ──────────────────────────────────────────────────
export function calculerPrelevementsAvance(foyer, annee) {
  const fiscal = getFiscal(annee)
  const { declarants, nbParts, revenusComplementaires, deductions } = foyer

  // Revenus nets imposables
  const netsDeclarants = declarants.map(d => salaireNetImposable(d, fiscal))
  const totalNets = netsDeclarants.reduce((a, n) => a + n, 0)

  // Revenus complémentaires
  const revFonciers = revenusComplementaires?.fonciers ?? 0
  const revAutres = revenusComplementaires?.autres ?? 0

  // Déductions
  const deficitFoncier = Math.min(deductions?.deficitFoncier ?? 0, 10700)
  const per = Math.min(
    deductions?.per ?? 0,
    totalNets * fiscal.deductions.per_plafond_pct_revenu
  )
  const pensionAlim = deductions?.pensionAlimentaire ?? 0

  // Revenu net imposable global
  const revenuImposable = Math.max(
    0,
    totalNets + revFonciers + revAutres - deficitFoncier - per - pensionAlim
  )

  // IR avant réductions
  const irBrut = appliquerBareme(revenuImposable, nbParts, fiscal)

  // Réductions dons
  const redDons = reductionDons(deductions?.dons, fiscal)

  const ir = Math.max(0, irBrut - redDons)

  // Cotisations par déclarant
  const parDeclarant = declarants.map((d, i) => ({
    id: d.id,
    cotisations: cotisationsDeclarant(d, fiscal),
    netImposable: netsDeclarants[i],
  }))

  const cotisations = parDeclarant.reduce((a, d) => a + d.cotisations, 0)

  return {
    ir,
    cotisations,
    total: ir + cotisations,
    parDeclarant,
    detail: { revenuImposable, irBrut, redDons, deficitFoncier, per, pensionAlim },
  }
}