const BASE = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets'
const DATASET = 'plf25-depenses-2025-selon-destination'

export async function fetchBudgetParMission() {
  const url = `${BASE}/${DATASET}/records`
    + `?limit=200`
    + `&group_by=libelle_mission,libelle_programme`
    + `&select=libelle_mission,libelle_programme,sum(credit_de_paiement)%20as%20total`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Erreur API : ${res.status}`)
  const data = await res.json()

  // Regrouper les programmes par mission
  const missionsMap = {}
  for (const r of data.results) {
    const m = r.libelle_mission
    if (!missionsMap[m]) {
      missionsMap[m] = { label: m, total: 0, programmes: [] }
    }
    missionsMap[m].total += r.total ?? 0
    missionsMap[m].programmes.push({
      label: r.libelle_programme,
      total: r.total ?? 0,
    })
  }

  // Convertir en tableau et calculer les pourcentages
  const missions = Object.values(missionsMap)
  const grandTotal = missions.reduce((acc, m) => acc + m.total, 0)

  return missions
    .sort((a, b) => b.total - a.total)
    .map(m => ({
      ...m,
      pct: (m.total / grandTotal) * 100,
      programmes: m.programmes
        .sort((a, b) => b.total - a.total)
        .map(p => ({
          ...p,
          pct: (p.total / grandTotal) * 100,
        })),
    }))
}