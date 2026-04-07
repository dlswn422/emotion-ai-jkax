const { createRouter, createWebHashHistory } = VueRouter;

import { LandingPage } from "../pages/LandingPage.js";
import { StoreListPage } from "../pages/StoreListPage.js";
import { StoreReportPage } from "../pages/StoreReportPage.js";
import { CustomerPage } from "../pages/StoreCustomerAnalysisPage.js";
import { B2BPage } from "../pages/B2BListPage.js";
import { B2BReportPage } from "../pages/B2BReportPage.js";
import { AdminPage } from "../pages/AdminPage.js";

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", component: LandingPage },
    { path: "/stores", component: StoreListPage },
    { path: "/report/:id", component: StoreReportPage },
    { path: "/B2B", component: B2BPage },
    { path: "/B2B-report/:id", component: B2BReportPage },
    { path: "/admin", component: AdminPage },
    { path: "/stores/:id/customers", component: CustomerPage },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
