import { createApp } from 'vue'
import TDesign from 'tdesign-vue-next'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import VueVirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
// 引入组件库的少量全局样式变量
import 'tdesign-vue-next/es/style/index.css'
import './assets/industrial-theme.css'
const app = createApp(App)
app.use(VueVirtualScroller)
app.use(createPinia())
app.use(router)
app.use(TDesign)
app.mount('#app')
