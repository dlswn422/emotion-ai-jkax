const { createRouter, createWebHashHistory } = VueRouter;

import { LandingPage } from '../pages/LandingPage.js';
import { StoreListPage } from '../pages/StoreListPage.js';
import { ReportPage } from '../pages/ReportPage.js';
import { CustomerPage } from '../pages/CustomerPage.js';
import { B2BPage } from '../pages/B2BPage.js';
import { B2BReportPage } from '../pages/B2BReportPage.js';
import { AdminPage } from '../pages/AdminPage.js';
import { MindMapPage } from '../pages/MindMapPage.js';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: LandingPage },
    { path: '/stores', component: StoreListPage },
    { path: '/report/:id', component: ReportPage },
    { path: '/B2B', component: B2BPage },
    { path: '/B2B-report/:id', component: B2BReportPage },
    { path: '/admin', component: AdminPage },
    { path: '/stores/:id/customers', component: CustomerPage },
    { path: '/mindmap', component: MindMapPage },
  ],
  scrollBehavior: () => ({ top: 0 }),
});