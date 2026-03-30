<script setup>
import { watch, onMounted, computed, ref } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import BudgetCharts from '@/components/BudgetCharts.vue'

const budget = useBudgetStore()
const user = useUserStore()
const { missions, secu, loading, error } = storeToRefs(budget)
const { annee, anneesDisponibles, mode, simple, avance } = storeToRefs(user)

const prelvs = computed(() => user.prelevements)
const expanded = ref(null)
const vueMode = ref('cartes')

watch(annee, (a) => budget.load(a))
onMounted(() => budget.load(annee.value))

function toggle(label) {
  expanded.value = expanded.value === label ? null : label
}

function myShare(pct, source) {
  const base = source === 'État' ? prelvs.value.ir : prelvs.value.cotisations
  return base * pct / 100
}

const grandTotal = computed(() => {
  if (!missions.value.length || !secu.value) return 0
  return missions.value.reduce((a, m) => a + m.total, 0) + secu.value.total
})

const lignesEtat = computed(() => {
  if (!missions.value.length || !grandTotal.value) return []
  return missions.value.map(m => ({
    label: m.label, source: 'État', total: m.total,
    pct: (m.total / grandTotal.value) * 100,
    programmes: m.programmes.map(p => ({
      label: p.label, source: 'État', total: p.total,
      pct: (p.total / grandTotal.value) * 100,
    })),
  })).sort((a, b) => b.total - a.total)
})

const lignesSecu = computed(() => {
  if (!secu.value || !grandTotal.value) return []
  return secu.value.branches.map(b => ({
    label: b.label, source: 'Sécu', total: b.total,
    pct: (b.total / grandTotal.value) * 100,
    programmes: b.programmes.map(p => ({
      label: p.label, source: 'Sécu', total: p.total,
      pct: (p.total / grandTotal.value) * 100,
    })),
  })).sort((a, b) => b.total - a.total)
})

const ICONES = {
  // Sécu
  'Retraites': '🧓',
  'Santé — Assurance maladie': '🏥',
  'Famille': '👨‍👩‍👧',
  'Chômage': '💼',
  'Accidents du travail & maladies professionnelles': '🦺',
  'Perte d\'autonomie (dépendance)': '🤝',
  // État
  'Enseignement scolaire': '📚',
  'Défense': '🛡️',
  'Sécurités': '🚔',
  'Engagements financiers de l\'État': '📉',
  'Remboursements et dégrèvements': '💸',
  'Solidarité, insertion et égalité des chances': '🤲',
  'Travail et emploi': '👷',
  'Recherche et enseignement supérieur': '🔬',
  'Justice': '⚖️',
  'Agriculture, alimentation, forêt et affaires rurales': '🌾',
  'Cohésion des territoires': '🏘️',
  'Écologie, développement et mobilité durables': '🌿',
  'Sport, jeunesse et vie associative': '⚽',
  'Culture': '🎭',
  'Santé': '💊',
  'Médias, livre et industries culturelles': '📰',
  'Immigration, asile et intégration': '🌍',
  'Aide publique au développement': '🌐',
  'Outre-mer': '🏝️',
  'Anciens combattants, mémoire et liens avec la Nation': '🎖️',
  'Direction de l\'action du Gouvernement': '🏛️',
  'Administration générale et territoriale de l\'État': '🗂️',
  'Gestion des finances publiques': '📊',
  'Relations avec les collectivités territoriales': '🗺️',
  'Action et transformation publiques': '⚙️',
  'Investissements d\'avenir': '🚀',
  'Plan de relance': '📈',
}

function icone(label) {
  return ICONES[label] ?? '📋'
}

function fmt(n) {
  return Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
}
function fmtMd(n) {
  return (n / 1_000_000_000).toFixed(1) + ' Md€'
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-8">

    <!-- Titre -->
    <h1 class="text-2xl font-semibold text-gray-900 mb-1">Où vont vos prélèvements ?</h1>
    <p class="text-gray-400 text-sm mb-6">Budget de l'État (PLF) + Sécurité sociale (LFSS)</p>

    <!-- Barre modes + année -->
    <div class="flex items-center gap-4 mb-6">
      <div class="flex rounded-lg border border-gray-200 overflow-hidden">
        <button
          @click="mode = 'simple'"
          class="px-4 py-2 text-sm transition-all"
          :class="mode === 'simple' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
        >Simplifié</button>
        <button
          @click="mode = 'avance'"
          class="px-4 py-2 text-sm transition-all"
          :class="mode === 'avance' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
        >Avancé</button>
      </div>
      <select v-model.number="annee" class="border border-gray-200 rounded-lg px-3 py-2 text-sm">
        <option v-for="a in anneesDisponibles" :key="a" :value="a">{{ a }}</option>
      </select>
    </div>

    <!-- ── MODE SIMPLIFIÉ ── -->
    <div v-if="mode === 'simple'" class="space-y-4 mb-6">

      <!-- Adultes du foyer + parts -->
      <div class="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-medium text-gray-700">Adultes du foyer</h2>
          <button
            v-if="simple.declarants.length < 2"
            @click="user.ajouterDeclarant('simple')"
            class="text-xs text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1 hover:bg-indigo-50"
          >+ Ajouter un adulte</button>
        </div>

        <div class="grid gap-4 mb-4" :class="simple.declarants.length === 2 ? 'md:grid-cols-2' : ''">
          <div v-for="d in simple.declarants" :key="d.id"
            class="bg-white border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-medium text-gray-600">Adulte {{ d.id }}</span>
              <button
                v-if="simple.declarants.length > 1"
                @click="user.supprimerDeclarant('simple', d.id)"
                class="text-xs text-red-400 hover:text-red-600"
              >Supprimer</button>
            </div>
            <div class="grid grid-cols-1 gap-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Salaire brut annuel (€)</label>
                <input v-model.number="d.salaireBrut" type="number" min="0" step="500"
                  class="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm" />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Statut</label>
                <select v-model="d.statut"
                  class="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm">
                  <option value="salarie">Salarié privé</option>
                  <option value="fonctionnaire">Fonctionnaire</option>
                  <option value="independant">Indépendant</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="max-w-xs">
          <label class="block text-xs text-gray-500 mb-1">Nombre de parts fiscales</label>
          <input v-model.number="simple.nbParts" type="number" min="1" max="10" step="0.5"
            class="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm" />
          <p class="text-xs text-gray-400 mt-1">1 = célibataire, 2 = couple, +0,5 par enfant à charge</p>
        </div>

        <p class="text-xs text-gray-400 mt-4">
          Frais réels, dons, revenus fonciers ?
          <button @click="mode = 'avance'" class="text-indigo-500 underline">Passez en mode avancé.</button>
        </p>
      </div>
    </div>

    <!-- ── MODE AVANCÉ ── -->
    <div v-else class="space-y-4 mb-6">

      <!-- Déclarants -->
      <div class="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-medium text-gray-700">Déclarants</h2>
          <button
            v-if="avance.declarants.length < 2"
            @click="user.ajouterDeclarant()"
            class="text-xs text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1 hover:bg-indigo-50"
          >+ Ajouter un déclarant</button>
        </div>
        <div class="grid gap-4" :class="avance.declarants.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1'">
          <div v-for="d in avance.declarants" :key="d.id" class="bg-white border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-medium text-gray-600">Déclarant {{ d.id }}</span>
              <button v-if="avance.declarants.length > 1" @click="user.supprimerDeclarant('avance', d.id)"
                class="text-xs text-red-400 hover:text-red-600">Supprimer</button>
            </div>
            <div class="grid grid-cols-1 gap-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Salaire brut annuel (€)</label>
                <input v-model.number="d.salaireBrut" type="number" min="0" step="500"
                  class="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm" />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Statut</label>
                <select v-model="d.statut" class="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm">
                  <option value="salarie">Salarié privé</option>
                  <option value="fonctionnaire">Fonctionnaire</option>
                  <option value="independant">Indépendant</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">
                  Frais réels (€) — laisser vide pour abattement 10% automatique
                </label>
                <input
                  :value="d.fraisReels ?? ''"
                  @input="d.fraisReels = $event.target.value === '' ? null : Number($event.target.value)"
                  type="number" min="0" step="100"
                  class="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm"
                  placeholder="Optionnel" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Revenus complémentaires + parts -->
      <div class="bg-gray-50 border border-gray-200 rounded-xl p-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label class="block text-xs text-gray-500 mb-1">Nombre de parts fiscales</label>
          <input v-model.number="avance.nbParts" type="number" min="1" max="10" step="0.5"
            class="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm" />
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">Revenus fonciers bruts (€)</label>
          <input v-model.number="avance.revenusComplementaires.fonciers" type="number" min="0" step="100"
            class="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm" />
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">Autres revenus (dividendes, etc.) (€)</label>
          <input v-model.number="avance.revenusComplementaires.autres" type="number" min="0" step="100"
            class="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm" />
        </div>
      </div>

      <!-- Déductions -->
      <div class="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h2 class="text-sm font-medium text-gray-700 mb-4">Déductions et réductions</h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3 mb-4">
          <div>
            <label class="block text-xs text-gray-500 mb-1">Déficit foncier (€, max 10 700€)</label>
            <input v-model.number="avance.deductions.deficitFoncier" type="number" min="0" max="10700" step="100"
              class="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Versements PER (€)</label>
            <input v-model.number="avance.deductions.per" type="number" min="0" step="100"
              class="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Pension alimentaire versée (€)</label>
            <input v-model.number="avance.deductions.pensionAlimentaire" type="number" min="0" step="100"
              class="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm" />
          </div>
        </div>

        <!-- Dons -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs text-gray-500">Dons aux associations</label>
            <button @click="user.ajouterDon()"
              class="text-xs text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1 hover:bg-indigo-50">
              + Ajouter un don
            </button>
          </div>
          <div v-for="(don, i) in avance.deductions.dons" :key="i" class="flex gap-3 mb-2">
            <input v-model.number="don.montant" type="number" min="0" step="10" placeholder="Montant (€)"
              class="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1" />
            <select v-model="don.type" class="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="standard">Standard (réduction 66%)</option>
              <option value="urgence">Aide aux personnes (réduction 75%)</option>
            </select>
            <button @click="user.supprimerDon(i)" class="text-red-400 hover:text-red-600 text-sm px-2">✕</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── RÉSUMÉ PRÉLÈVEMENTS ── -->
    <div class="grid grid-cols-3 gap-4 mb-8">
      <div class="bg-white border border-gray-200 rounded-xl p-4">
        <p class="text-xs text-gray-400 mb-1">Impôt sur le revenu estimé</p>
        <p class="text-xl font-semibold text-gray-900">{{ fmt(prelvs.ir) }}</p>
        <p class="text-xs text-gray-400 mt-1">Vers le budget de l'État</p>
      </div>
      <div class="bg-white border border-gray-200 rounded-xl p-4">
        <p class="text-xs text-gray-400 mb-1">Cotisations sociales estimées</p>
        <p class="text-xl font-semibold text-gray-900">{{ fmt(prelvs.cotisations) }}</p>
        <p class="text-xs text-gray-400 mt-1">Vers la Sécurité sociale</p>
      </div>
      <div class="bg-white border border-gray-200 rounded-xl p-4">
        <p class="text-xs text-gray-400 mb-1">Total prélevé estimé</p>
        <p class="text-xl font-semibold text-indigo-600">{{ fmt(prelvs.total) }}</p>
        <p class="text-xs text-gray-400 mt-1">Estimation indicative</p>
      </div>
    </div>

    <!-- Détail mode avancé par déclarant -->
    <div v-if="mode === 'avance' && prelvs.parDeclarant" class="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
      <p class="text-xs font-medium text-gray-500 mb-3">Détail par déclarant</p>
      <div class="grid gap-3" :class="prelvs.parDeclarant.length === 2 ? 'md:grid-cols-2' : ''">
        <div v-for="d in prelvs.parDeclarant" :key="d.id" class="bg-white border border-gray-100 rounded-lg p-3">
          <p class="text-xs font-medium text-gray-600 mb-2">Déclarant {{ d.id }}</p>
          <div class="flex justify-between text-xs text-gray-500">
            <span>Net imposable</span><span class="font-medium text-gray-800">{{ fmt(d.netImposable) }}</span>
          </div>
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>Cotisations sociales</span><span class="font-medium text-emerald-600">{{ fmt(d.cotisations) }}</span>
          </div>
        </div>
      </div>
      <div v-if="prelvs.detail" class="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-2 md:grid-cols-4">
        <div class="text-xs text-gray-500">Revenu imposable <span class="block font-medium text-gray-800">{{ fmt(prelvs.detail.revenuImposable) }}</span></div>
        <div class="text-xs text-gray-500">IR avant réductions <span class="block font-medium text-gray-800">{{ fmt(prelvs.detail.irBrut) }}</span></div>
        <div class="text-xs text-gray-500">Réduction dons <span class="block font-medium text-red-500">-{{ fmt(prelvs.detail.redDons) }}</span></div>
        <div class="text-xs text-gray-500">PER déduit <span class="block font-medium text-red-500">-{{ fmt(prelvs.detail.per) }}</span></div>
      </div>
    </div>

    <!-- ── TOGGLE VUE ── -->
    <div class="flex items-center gap-2 mb-6">
      <button
        v-for="[key, label] in [['cartes', 'Cartes'], ['graphiques', 'Graphiques']]"
        :key="key"
        @click="vueMode = key"
        class="px-4 py-1.5 text-sm rounded-lg border transition-all"
        :class="vueMode === key
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'"
      >{{ label }}</button>
    </div>

    <!-- ── CONTENU BUDGET ── -->
    <p v-if="loading" class="text-gray-400">Chargement des données...</p>
    <p v-else-if="error" class="text-red-500">Erreur : {{ error }}</p>
    <div v-else class="space-y-10">

      <!-- Vue graphiques -->
      <BudgetCharts
        v-if="vueMode === 'graphiques'"
        :lignesSecu="lignesSecu"
        :lignesEtat="lignesEtat"
        :myShare="myShare"
      />

      <!-- Vue cartes -->
      <template v-if="vueMode === 'cartes'">

      <!-- Section Sécurité Sociale -->
      <section>
        <div class="flex items-center gap-3 mb-5">
          <div class="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></div>
          <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sécurité Sociale</h2>
          <span class="text-xs text-gray-400">{{ secu ? fmtMd(secu.total) : '' }} — LFSS {{ annee }}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="b in lignesSecu" :key="b.label"
            class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-emerald-200 transition-colors"
          >
            <div class="p-4">
              <div class="flex items-start justify-between mb-2">
                <span class="text-2xl leading-none">{{ icone(b.label) }}</span>
                <span class="text-xs text-gray-400 tabular-nums">{{ b.pct.toFixed(1) }}%</span>
              </div>
              <h3 class="text-sm font-semibold text-gray-800 leading-tight mb-4">{{ b.label }}</h3>
              <div class="flex items-end justify-between">
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Budget total</p>
                  <p class="text-sm font-medium text-gray-500 tabular-nums">{{ fmtMd(b.total) }}</p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-gray-400 mb-0.5">Ma quote-part</p>
                  <p class="text-lg font-bold text-emerald-600 tabular-nums">{{ fmt(myShare(b.pct, b.source)) }}</p>
                </div>
              </div>
            </div>
            <button
              @click="toggle(b.label)"
              class="w-full px-4 py-2 text-xs text-gray-400 hover:text-emerald-600 bg-gray-50 hover:bg-emerald-50 transition-colors border-t border-gray-100 flex items-center justify-center gap-1.5"
            >
              <span class="text-[10px]">{{ expanded === b.label ? '▲' : '▼' }}</span>
              <span>{{ expanded === b.label ? 'Masquer' : `${b.programmes.length} sous-postes` }}</span>
            </button>
            <div v-if="expanded === b.label">
              <div
                v-for="p in b.programmes" :key="p.label"
                class="flex items-start justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50"
              >
                <span class="text-xs text-gray-600 flex-1 pr-3 leading-snug">{{ p.label }}</span>
                <span class="text-xs font-semibold text-emerald-500 tabular-nums shrink-0">{{ fmt(myShare(p.pct, p.source)) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section Budget de l'État -->
      <section>
        <div class="flex items-center gap-3 mb-5">
          <div class="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0"></div>
          <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Budget de l'État</h2>
          <span class="text-xs text-gray-400">PLF {{ annee }}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="m in lignesEtat" :key="m.label"
            class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-indigo-200 transition-colors"
          >
            <div class="p-4">
              <div class="flex items-start justify-between mb-2">
                <span class="text-2xl leading-none">{{ icone(m.label) }}</span>
                <span class="text-xs text-gray-400 tabular-nums">{{ m.pct.toFixed(1) }}%</span>
              </div>
              <h3 class="text-sm font-semibold text-gray-800 leading-tight mb-4">{{ m.label }}</h3>
              <div class="flex items-end justify-between">
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Budget total</p>
                  <p class="text-sm font-medium text-gray-500 tabular-nums">{{ fmtMd(m.total) }}</p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-gray-400 mb-0.5">Ma quote-part</p>
                  <p class="text-lg font-bold text-indigo-600 tabular-nums">{{ fmt(myShare(m.pct, m.source)) }}</p>
                </div>
              </div>
            </div>
            <button
              @click="toggle(m.label)"
              class="w-full px-4 py-2 text-xs text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 transition-colors border-t border-gray-100 flex items-center justify-center gap-1.5"
            >
              <span class="text-[10px]">{{ expanded === m.label ? '▲' : '▼' }}</span>
              <span>{{ expanded === m.label ? 'Masquer' : `${m.programmes.length} sous-postes` }}</span>
            </button>
            <div v-if="expanded === m.label">
              <div
                v-for="p in m.programmes" :key="p.label"
                class="flex items-start justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50"
              >
                <span class="text-xs text-gray-600 flex-1 pr-3 leading-snug">{{ p.label }}</span>
                <span class="text-xs font-semibold text-indigo-500 tabular-nums shrink-0">{{ fmt(myShare(p.pct, p.source)) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      </template>

      <p class="text-xs text-gray-300 text-center">
        Estimation indicative — barème {{ annee }}.
        Sources : PLF {{ annee }} (data.economie.gouv.fr) · LFSS {{ annee }}.
      </p>
    </div>
  </div>
</template>
