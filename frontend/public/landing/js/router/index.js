const { createRouter, createWebHashHistory } = VueRouter;

import { LandingPage } from '../pages/LandingPage.js';
import { StoreListPage } from '../pages/StoreListPage.js';
import { ReportPage } from '../pages/ReportPage.js';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: LandingPage },
    { path: '/stores', component: StoreListPage },
    { path: '/report/:id', component: ReportPage }
  ],
  scrollBehavior: () => ({ top: 0 })
});