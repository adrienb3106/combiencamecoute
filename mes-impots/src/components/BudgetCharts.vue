<script setup>
import { computed } from 'vue'
import { Doughnut, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const props = defineProps({
  lignesSecu: { type: Array, default: () => [] },
  lignesEtat: { type: Array, default: () => [] },
  myShare: { type: Function, required: true },
})

function fmtEur(n) {
  return Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
}

const tooltipCallbacks = {
  callbacks: { label: (ctx) => '  ' + fmtEur(ctx.raw ?? 0) },
}

// ── Donut Sécurité Sociale ──
const SECU_COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#bbf7d0']

const donutSecuData = computed(() => ({
  labels: props.lignesSecu.map(b => b.label),
  datasets: [{
    data: props.lignesSecu.map(b => Math.round(props.myShare(b.pct, b.source) * 100) / 100),
    backgroundColor: SECU_COLORS,
    borderWidth: 2,
    borderColor: '#fff',
    hoverOffset: 8,
  }],
}))

const donutOptions = (color) => ({
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { font: { size: 11 }, padding: 14, boxWidth: 12, color: '#6b7280' },
    },
    tooltip: tooltipCallbacks,
  },
  cutout: '62%',
})

// ── Donut Budget de l'État ──
const ETAT_COLORS = [
  '#1e1b4b', '#312e81', '#3730a3', '#4338ca',
  '#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe',
]

const donutEtatData = computed(() => {
  const sorted = [...props.lignesEtat].sort(
    (a, b) => props.myShare(b.pct, b.source) - props.myShare(a.pct, a.source)
  )
  const TOP = 8
  const top = sorted.slice(0, TOP)
  const rest = sorted.slice(TOP)
  const items = rest.length > 0
    ? [...top, { label: `${rest.length} autres missions`, source: 'État', pct: rest.reduce((s, m) => s + m.pct, 0) }]
    : top

  return {
    labels: items.map(m => m.label),
    datasets: [{
      data: items.map(m => Math.round(props.myShare(m.pct, m.source) * 100) / 100),
      backgroundColor: ETAT_COLORS.slice(0, items.length),
      borderWidth: 2,
      borderColor: '#fff',
      hoverOffset: 8,
    }],
  }
})

// ── Barres horizontales ──
const barData = computed(() => {
  const all = [
    ...props.lignesSecu.map(b => ({ label: b.label, source: b.source, share: props.myShare(b.pct, b.source) })),
    ...props.lignesEtat.map(m => ({ label: m.label, source: m.source, share: props.myShare(m.pct, m.source) })),
  ].sort((a, b) => b.share - a.share)

  return {
    labels: all.map(l => l.label),
    datasets: [{
      data: all.map(l => Math.round(l.share * 100) / 100),
      backgroundColor: all.map(l => l.source === 'Sécu' ? '#10b981' : '#6366f1'),
      borderRadius: 4,
      borderSkipped: false,
    }],
  }
})

const barOptions = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: tooltipCallbacks,
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: '#f3f4f6' },
      border: { display: false },
      ticks: {
        font: { size: 10 },
        color: '#9ca3af',
        callback: (v) => Number(v).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
      },
    },
    y: {
      grid: { display: false },
      border: { display: false },
      ticks: { font: { size: 11 }, color: '#374151' },
    },
  },
}

const barHeight = computed(() => Math.max(420, (props.lignesSecu.length + props.lignesEtat.length) * 30) + 'px')
</script>

<template>
  <div class="space-y-6">

    <!-- Donuts côte à côte -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

      <div class="bg-white border border-gray-200 rounded-xl p-5">
        <div class="flex items-center gap-2 mb-5">
          <div class="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></div>
          <span class="text-sm font-semibold text-gray-700">Sécurité Sociale</span>
        </div>
        <Doughnut :data="donutSecuData" :options="donutOptions('emerald')" />
      </div>

      <div class="bg-white border border-gray-200 rounded-xl p-5">
        <div class="flex items-center gap-2 mb-5">
          <div class="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></div>
          <span class="text-sm font-semibold text-gray-700">Budget de l'État</span>
        </div>
        <Doughnut :data="donutEtatData" :options="donutOptions('indigo')" />
      </div>

    </div>

    <!-- Barres horizontales -->
    <div class="bg-white border border-gray-200 rounded-xl p-5">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-sm font-semibold text-gray-700">Tous les postes — ma quote-part</h3>
        <div class="flex items-center gap-4">
          <span class="flex items-center gap-1.5 text-xs text-gray-400">
            <span class="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block shrink-0"></span>Sécu
          </span>
          <span class="flex items-center gap-1.5 text-xs text-gray-400">
            <span class="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block shrink-0"></span>État
          </span>
        </div>
      </div>
      <div :style="{ height: barHeight }">
        <Bar :data="barData" :options="barOptions" />
      </div>
    </div>

  </div>
</template>
