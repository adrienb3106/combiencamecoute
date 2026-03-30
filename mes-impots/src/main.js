import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { useUserStore } from '@/stores/user'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

const userStore = useUserStore()

const saved = localStorage.getItem('mes-impots-user')
if (saved) {
  try { userStore.$patch(JSON.parse(saved)) } catch {}
}

userStore.$subscribe((_, state) => {
  localStorage.setItem('mes-impots-user', JSON.stringify(state))
})

app.mount('#app')
