import { defineStore } from 'pinia'
import { fetchBudgetParMission } from '@/services/datagouv.js'

const secuModules = import.meta.glob('@/data/*/secu.json', { eager: true })

function getSecu(annee) {
  const key = `/src/data/${annee}/secu.json`
  const mod = secuModules[key]
  if (!mod) throw new Error(`Pas de données Sécu pour ${annee}`)
  return mod.default ?? mod
}

export const useBudgetStore = defineStore('budget', {
  state: () => ({
    missions: [],
    secu: null,
    loading: false,
    error: null,
    anneeChargee: null,
  }),
  actions: {
    async load(annee) {
      if (this.anneeChargee === annee) return
      this.loading = true
      this.error = null
      try {
        this.missions = await fetchBudgetParMission()
        this.secu = getSecu(annee)
        this.anneeChargee = annee
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },
  },
})