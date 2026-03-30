import { defineStore } from 'pinia'
import { calculerPrelevementsAvance } from '@/services/calcul.js'

const ANNEES_DISPONIBLES = [2025]

const declarantVide = (id) => ({
  id,
  salaireBrut: 0,
  statut: 'salarie',
  fraisReels: null,
})

export const useUserStore = defineStore('user', {
  state: () => ({
    annee: 2025,
    mode: 'simple',

    // Mode simple
    simple: {
      impotNet: 3500,
      declarants: [declarantVide(1)],
    },

    // Mode avancé
    avance: {
      nbParts: 1,
      declarants: [declarantVide(1)],
      revenusComplementaires: {
        fonciers: 0,
        autres: 0,
      },
      deductions: {
        deficitFoncier: 0,
        per: 0,
        pensionAlimentaire: 0,
        dons: [],
      },
    },
  }),

  getters: {
    anneesDisponibles: () => ANNEES_DISPONIBLES,

    prelevements: (state) => {
      if (state.mode === 'simple') {
        // Cotisations : on calcule par déclarant puis on somme
        const foyerSimple = {
          nbParts: 1,
          declarants: state.simple.declarants,
          revenusComplementaires: { fonciers: 0, autres: 0 },
          deductions: { deficitFoncier: 0, per: 0, pensionAlimentaire: 0, dons: [] },
        }
        const calc = calculerPrelevementsAvance(foyerSimple, state.annee)
        return {
          ir: state.simple.impotNet,
          cotisations: calc.cotisations,
          total: state.simple.impotNet + calc.cotisations,
          parDeclarant: calc.parDeclarant,
        }
      }
      return calculerPrelevementsAvance(state.avance, state.annee)
    },
  },

  actions: {
    ajouterDeclarant(mode) {
      const cible = mode === 'simple' ? this.simple : this.avance
      if (cible.declarants.length >= 2) return
      cible.declarants.push(declarantVide(2))
    },

    supprimerDeclarant(mode, id) {
      const cible = mode === 'simple' ? this.simple : this.avance
      if (cible.declarants.length <= 1) return
      cible.declarants = cible.declarants.filter(d => d.id !== id)
    },

    ajouterDon() {
      this.avance.deductions.dons.push({ montant: 0, type: 'standard' })
    },

    supprimerDon(index) {
      this.avance.deductions.dons.splice(index, 1)
    },
  },
})