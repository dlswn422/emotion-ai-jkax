const { createApp } = Vue;

import { router } from './router/index.js';

createApp({
  template: `
    <router-view v-slot="{ Component }">
      <transition name="fade-page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  `
})
.use(router)
.mount('#app');