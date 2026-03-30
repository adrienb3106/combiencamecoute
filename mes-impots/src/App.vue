<script setup>
import { watch, onMounted, computed, ref } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'

const budget = useBudgetStore()
const user = useUserStore()
const { missions, secu, loading, error } = storeToRefs(budget)
const { annee, anneesDisponibles, mode, simple, avance } = storeToRefs(user)

const prelvs = computed(() => user.prelevements)
const expanded = ref(null)

watch(annee, (a) => budget.load(a))
onMounted(() => budget.load(annee.value))

function toggle(label) {
  expanded.value = expanded.value === label ? null : label
}

function myShare(pct, source) {
  const base = source === 'État' ? prelvs.value.ir : prelvs.value.cotisations
  return base * pct / 100
}

const vueGlobale = computed(() => {
  if (!missions.value.length || !secu.value) return []
  const totalEtat = missions.value.reduce((a, m) => a + m.total, 0)
  const totalSecu = secu.value.total
  const grandTotal = totalEtat + totalSecu

  const lignesEtat = missions.value.map(m => ({
    label: m.label, source: 'État', total: m.total,
    pct: (m.total / grandTotal) * 100,
    programmes: m.programmes.map(p => ({
      label: p.label, source: 'État', total: p.total,
      pct: (p.total / grandTotal) * 100,
    })),
  }))

  const lignesSecu = secu.value.branches.map(b => ({
    label: b.label, source: 'Sécu', total: b.total,
    pct: (b.total / grandTotal) * 100,
    programmes: b.programmes.map(p => ({
      label: p.label, source: 'Sécu', total: p.total,
      pct: (p.total / grandTotal) * 100,
    })),
  }))

  return [...lignesEtat, ...lignesSecu].sort((a, b) => b.total - a.total)
})

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

      <!-- Impôt net -->
      <div class="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <div class="max-w-xs">
          <label class="block text-xs text-gray-500 mb-1">
            Impôt net sur le revenu (€) — visible sur votre avis d'imposition
          </label>
          <input
            v-model.number="simple.impotNet"
            type="number" min="0" step="100"
            class="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm"
            placeholder="ex : 3 500"
          />
        </div>
      </div>

      <!-- Déclarants -->
      <div class="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-medium text-gray-700">Adultes du foyer</h2>
          <button
            v-if="simple.declarants.length < 2"
            @click="user.ajouterDeclarant('simple')"
            class="text-xs text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1 hover:bg-indigo-50"
          >+ Ajouter un adulte</button>
        </div>

        <div class="grid gap-4" :class="simple.declarants.length === 2 ? 'md:grid-cols-2' : ''">
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

        <p class="text-xs text-gray-400 mt-4">
          Vous avez des frais réels, des dons ou des revenus fonciers ?
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
              <button v-if="avance.declarants.length > 1" @click="user.supprimerDeclarant(d.id)"
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

    <!-- ── TABLEAU GLOBAL ── -->
    <p v-if="loading" class="text-gray-400">Chargement des données...</p>
    <p v-else-if="error" class="text-red-500">Erreur : {{ error }}</p>
    <div v-else>
      <div class="grid grid-cols-12 gap-2 px-4 pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
        <div class="col-span-1">Source</div>
        <div class="col-span-4">Poste</div>
        <div class="col-span-2 text-right">Budget total</div>
        <div class="col-span-2 text-right">% du total</div>
        <div class="col-span-3 text-right">Ma quote-part</div>
      </div>

      <div v-for="m in vueGlobale" :key="m.label" class="mb-1">
        <div
          @click="toggle(m.label)"
          class="grid grid-cols-12 gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-all"
          :class="expanded === m.label ? 'rounded-b-none border-b-0' : ''"
        >
          <div class="col-span-1 flex items-center">
            <span class="text-xs font-medium px-2 py-0.5 rounded-full"
              :class="m.source === 'État' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'">
              {{ m.source === 'État' ? 'État' : 'Sécu' }}
            </span>
          </div>
          <div class="col-span-4 flex items-center gap-2">
            <span class="text-gray-300 text-xs">{{ expanded === m.label ? '▼' : '▶' }}</span>
            <span class="text-sm font-medium text-gray-800">{{ m.label }}</span>
          </div>
          <div class="col-span-2 text-right text-sm text-gray-500">{{ fmtMd(m.total) }}</div>
          <div class="col-span-2 text-right text-sm text-gray-500">{{ m.pct.toFixed(1) }}%</div>
          <div class="col-span-3 text-right text-sm font-semibold"
            :class="m.source === 'État' ? 'text-indigo-600' : 'text-emerald-600'">
            {{ fmt(myShare(m.pct, m.source)) }}
          </div>
        </div>

        <div v-if="expanded === m.label" class="border border-gray-200 border-t-0 rounded-b-xl overflow-hidden">
          <div v-for="p in m.programmes" :key="p.label"
            class="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-t border-gray-100">
            <div class="col-span-1"></div>
            <div class="col-span-4 pl-4 text-xs text-gray-600">{{ p.label }}</div>
            <div class="col-span-2 text-right text-xs text-gray-400">{{ fmtMd(p.total) }}</div>
            <div class="col-span-2 text-right text-xs text-gray-400">{{ p.pct.toFixed(2) }}%</div>
            <div class="col-span-3 text-right text-xs font-medium"
              :class="p.source === 'État' ? 'text-indigo-500' : 'text-emerald-500'">
              {{ fmt(myShare(p.pct, p.source)) }}
            </div>
          </div>
        </div>
      </div>

      <p class="text-xs text-gray-300 mt-6 text-center">
        Estimation indicative — barème {{ annee }}.
        Sources : PLF {{ annee }} (data.economie.gouv.fr) · LFSS {{ annee }}.
      </p>
    </div>
  </div>
</template>