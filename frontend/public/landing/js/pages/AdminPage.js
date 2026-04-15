const { defineComponent, ref, computed, onMounted, watch } = Vue;
const { useRouter, useRoute } = VueRouter;

import { NavBar } from "../components/NavBar.js";
import { AlertPanel } from "../components/AlertPanel.js";
import { DB_STORE, B2B_COMPANIES, GLOBAL_TAB_STATUSES } from "../b2b/shared.js";

export const AdminPage = defineComponent({
  name: "AdminPage",
  components: { NavBar, AlertPanel },

  setup() {
    const router = useRouter();
    const route = useRoute();

    const VALID_ADMIN_TABS = [
      "competitors",
      "customers",
      "datasources",
      "keywords",
      "prospects",
      "ci_sources",
      "ci_keywords",
      "tabstatus",
    ];

    const initTab =
      route.query.tab && VALID_ADMIN_TABS.includes(route.query.tab)
        ? route.query.tab
        : "competitors";

    const adminTab = ref(initTab);
    const db = DB_STORE;
    const saving = ref(false);
    const saveMsg = ref("");
    let saveMsgTimer = null;

    function showSaveOk(msg = "저장되었습니다 ✓") {
      saveMsg.value = msg;
      if (saveMsgTimer) clearTimeout(saveMsgTimer);
      saveMsgTimer = setTimeout(() => {
        saveMsg.value = "";
      }, 2500);
    }

    function showSaveErr(msg = "저장 실패 — 다시 시도하세요") {
      saveMsg.value = "⚠ " + msg;
      if (saveMsgTimer) clearTimeout(saveMsgTimer);
      saveMsgTimer = setTimeout(() => {
        saveMsg.value = "";
      }, 4000);
    }

    const selectedCompId = ref(B2B_COMPANIES[0]?.id || "shinilpharm");

    /* =========================
       ① 경쟁사
    ========================= */
    const compSearch = ref("");
    const editingCompId = ref(null);
    const compDraft = ref({});

    const filteredComps = computed(() => {
      const q = compSearch.value.toLowerCase();
      const all = db.competitors.filter(
        (c) => c.comp_id === selectedCompId.value,
      );
      return all.filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.industry || "").toLowerCase().includes(q),
      );
    });

    function startEditComp(c) {
      editingCompId.value = c._id;
      compDraft.value = { ...c };
    }

    function cancelEditComp() {
      editingCompId.value = null;
    }

    async function commitEditComp() {
      if (!compDraft.value.name?.trim()) return;
      saving.value = true;
      try {
        await db.updateCompetitor(editingCompId.value, {
          comp_id: selectedCompId.value,
          name: compDraft.value.name,
          industry: compDraft.value.industry,
          score: Number(compDraft.value.score),
          googleRating: Number(compDraft.value.googleRating),
          sentiment: Number(compDraft.value.sentiment),
          nps: Number(compDraft.value.nps),
          color: compDraft.value.color,
          note: compDraft.value.note,
          isMe: !!compDraft.value.isMe,
        });
        showSaveOk(
          `'${compDraft.value.name}' 경쟁사 정보가 업데이트되었습니다 ✓`,
        );
        editingCompId.value = null;
      } catch (e) {
        console.error(e);
        showSaveErr("경쟁사 저장 실패 — 네트워크를 확인해 주세요");
      } finally {
        saving.value = false;
      }
    }

    const addingComp = ref(false);
    const newCompRow = ref({});
    const COMP_BLANK = () => ({
      name: "",
      industry: "",
      score: 70,
      googleRating: 4.0,
      sentiment: 60,
      nps: 30,
      color: "#6366f1",
      note: "",
      isMe: false,
    });

    function openAddCompRow() {
      newCompRow.value = COMP_BLANK();
      addingComp.value = true;
    }

    function cancelNewCompRow() {
      addingComp.value = false;
    }

    async function submitNewCompRow() {
      if (!newCompRow.value.name?.trim()) return;
      saving.value = true;
      try {
        await db.addCompetitor({
          comp_id: selectedCompId.value,
          ...newCompRow.value,
          score: Number(newCompRow.value.score),
          googleRating: Number(newCompRow.value.googleRating),
          sentiment: Number(newCompRow.value.sentiment),
          nps: Number(newCompRow.value.nps),
        });
        showSaveOk(`'${newCompRow.value.name}' 경쟁사가 추가되었습니다 ✓`);
        addingComp.value = false;
      } catch (e) {
        console.error(e);
        showSaveErr("경쟁사 추가 실패");
      } finally {
        saving.value = false;
      }
    }

    async function deleteComp(_id) {
      if (!confirm("이 경쟁사를 삭제하시겠습니까?")) return;
      saving.value = true;
      try {
        await db.deleteCompetitor(_id);
        showSaveOk("경쟁사가 삭제되었습니다");
      } catch (e) {
        console.error(e);
        showSaveErr("경쟁사 삭제 실패");
      } finally {
        saving.value = false;
      }
    }

    /* =========================
       ② 고객
    ========================= */
    const custSearch = ref("");
    const custGrade = ref("ALL");
    const editingCustId = ref(null);
    const custDraft = ref({});

    const filteredCust = computed(() => {
      const q = custSearch.value.toLowerCase();
      const all = db.customers.filter(
        (c) => c.comp_id === selectedCompId.value,
      );
      return all.filter(
        (c) =>
          (!q ||
            c.name.toLowerCase().includes(q) ||
            (c.company || "").toLowerCase().includes(q) ||
            (c.email || "").toLowerCase().includes(q)) &&
          (custGrade.value === "ALL" || c.grade === custGrade.value),
      );
    });

    function startEditCust(c) {
      editingCustId.value = c._id;
      custDraft.value = { ...c };
    }

    function cancelEditCust() {
      editingCustId.value = null;
    }

    async function commitEditCust() {
      if (!custDraft.value.name?.trim()) return;
      saving.value = true;
      try {
        await db.updateCustomer(editingCustId.value, {
          comp_id: selectedCompId.value,
          name: custDraft.value.name,
          company: custDraft.value.company,
          contact: custDraft.value.contact,
          email: custDraft.value.email,
          grade: custDraft.value.grade,
          segment: custDraft.value.segment,
          note: custDraft.value.note,
        });
        showSaveOk(
          `'${custDraft.value.name}' 고객 정보가 업데이트되었습니다 ✓`,
        );
        editingCustId.value = null;
      } catch (e) {
        console.error(e);
        showSaveErr("고객 저장 실패 — 네트워크를 확인해 주세요");
      } finally {
        saving.value = false;
      }
    }

    const addingCust = ref(false);
    const newCustRow = ref({});
    const CUST_BLANK = () => ({
      name: "",
      company: "",
      contact: "",
      email: "",
      grade: "일반",
      segment: "신규",
      note: "",
    });

    function openAddCustRow() {
      newCustRow.value = CUST_BLANK();
      addingCust.value = true;
    }

    function cancelNewCustRow() {
      addingCust.value = false;
    }

    async function submitNewCustRow() {
      if (!newCustRow.value.name?.trim()) return;
      saving.value = true;
      try {
        await db.addCustomer({
          comp_id: selectedCompId.value,
          ...newCustRow.value,
        });
        showSaveOk(`'${newCustRow.value.name}' 고객이 추가되었습니다 ✓`);
        addingCust.value = false;
      } catch (e) {
        console.error(e);
        showSaveErr("고객 추가 실패");
      } finally {
        saving.value = false;
      }
    }

    async function deleteCust(_id) {
      if (!confirm("이 고객을 삭제하시겠습니까?")) return;
      saving.value = true;
      try {
        await db.deleteCustomer(_id);
        showSaveOk("고객이 삭제되었습니다");
      } catch (e) {
        console.error(e);
        showSaveErr("고객 삭제 실패");
      } finally {
        saving.value = false;
      }
    }

    /* =========================
       ③ 탭 상태
    ========================= */
    const TAB_LABELS = {
      external: "고객 동향 분석",
      ownreview: "리뷰 감정 분석",
      competitive: "경쟁사 분석",
      internal: "직원 감정 분석",
    };
    const TAB_IDS = ["external", "ownreview", "competitive", "internal"];

    function getTabStatus(cId, tabId) {
      return db.getTabStatus(cId, tabId);
    }

    async function setTabStatus(cId, tabId, status) {
      saving.value = true;
      try {
        await db.setTabStatus(cId, tabId, status);
        showSaveOk("탭 상태가 업데이트되었습니다 ✓");
      } catch (e) {
        console.error(e);
        showSaveErr("탭 상태 저장 실패");
      } finally {
        saving.value = false;
      }
    }

    const STATUS_CONFIG = {
      ready: {
        label: "정상",
        color: "#10b981",
        bg: "#ecfdf5",
        border: "#a7f3d0",
      },
      wip: {
        label: "작업중",
        color: "#b45309",
        bg: "#fef3c7",
        border: "#fde68a",
      },
      disabled: {
        label: "미연동",
        color: "#64748b",
        bg: "#f1f5f9",
        border: "#cbd5e1",
      },
    };

    const wipCount = computed(() =>
      B2B_COMPANIES.reduce(
        (a, c) =>
          a + TAB_IDS.filter((t) => db.getTabStatus(c.id, t) === "wip").length,
        0,
      ),
    );

    const disabledCount = computed(() =>
      B2B_COMPANIES.reduce(
        (a, c) =>
          a +
          TAB_IDS.filter((t) => db.getTabStatus(c.id, t) === "disabled").length,
        0,
      ),
    );

    /* =========================
       공통
    ========================= */
    const GRADE_COLORS = { VIP: "#6366f1", 우수: "#10b981", 일반: "#64748b" };
    const SEG_OPTIONS = ["신규", "재구매", "장기거래", "휴면", "이탈위험"];
    const scoreColor = (s) =>
      s >= 75 ? "#10b981" : s >= 60 ? "#f59e0b" : "#f43f5e";

    /* =========================
       ④ 데이터 수집 원천
    ========================= */
    const srcSearch = ref("");
    const editingSrcId = ref(null);
    const srcDraft = ref({});
    const addingSrc = ref(false);
    const newSrcRow = ref({});
    const SRC_BLANK = () => ({
      priority: 1,
      site_name: "",
      url: "",
      method: "API",
      keywords: "",
      purpose: "",
      category: "신규 수요",
      active: true,
      last_collected: "",
    });

    const METHOD_OPTIONS = ["API", "크롤링", "크롤링/API", "RSS"];
    const CATEGORY_OPTIONS = [
      "확정 수요",
      "생산 확대",
      "신규 수요",
      "실제 구매 수요",
      "투자 동향",
      "규제 동향",
      "경쟁 동향",
    ];

    const filteredSrcs = computed(() => {
      const q = srcSearch.value.toLowerCase();
      const all = db.dataSources.filter(
        (d) => d.comp_id === selectedCompId.value,
      );
      return all.filter(
        (d) =>
          !q ||
          d.site_name.toLowerCase().includes(q) ||
          (d.keywords || "").toLowerCase().includes(q),
      );
    });

    function startEditSrc(s) {
      editingSrcId.value = s._id;
      srcDraft.value = { ...s };
    }

    function cancelEditSrc() {
      editingSrcId.value = null;
    }

    async function commitEditSrc() {
      if (!srcDraft.value.site_name?.trim()) return;
      saving.value = true;
      try {
        await db.updateDataSource(editingSrcId.value, {
          comp_id: selectedCompId.value,
          ...srcDraft.value,
          priority: Number(srcDraft.value.priority) || 1,
          active: !!srcDraft.value.active,
        });
        showSaveOk(
          `'${srcDraft.value.site_name}' 수집 원천이 업데이트되었습니다 ✓`,
        );
        editingSrcId.value = null;
      } catch (e) {
        console.error(e);
        showSaveErr("수집 원천 저장 실패");
      } finally {
        saving.value = false;
      }
    }

    function openAddSrcRow() {
      newSrcRow.value = SRC_BLANK();
      addingSrc.value = true;
    }

    function cancelNewSrcRow() {
      addingSrc.value = false;
    }

    async function submitNewSrcRow() {
      if (!newSrcRow.value.site_name?.trim()) return;
      saving.value = true;
      try {
        await db.addDataSource({
          comp_id: selectedCompId.value,
          ...newSrcRow.value,
          priority: Number(newSrcRow.value.priority) || 1,
          active: !!newSrcRow.value.active,
        });
        showSaveOk(`'${newSrcRow.value.site_name}' 원천이 추가되었습니다 ✓`);
        addingSrc.value = false;
      } catch (e) {
        console.error(e);
        showSaveErr("수집 원천 추가 실패");
      } finally {
        saving.value = false;
      }
    }

    async function deleteSrc(_id, name) {
      if (!confirm(`'${name}' 수집 원천을 삭제하시겠습니까?`)) return;
      saving.value = true;
      try {
        await db.deleteDataSource(_id);
        showSaveOk("수집 원천이 삭제되었습니다");
      } catch (e) {
        console.error(e);
        showSaveErr("수집 원천 삭제 실패");
      } finally {
        saving.value = false;
      }
    }

    /* =========================
       ⑤ 시그널 키워드
    ========================= */
    const kwSearch = ref("");
    const editingKwId = ref(null);
    const kwDraft = ref({});
    const addingKw = ref(false);
    const newKwRow = ref({});
    const KW_BLANK = () => ({
      keyword: "",
      kw_type: "이벤트",
      signal_level: "medium",
      source_ids: "",
      trigger_desc: "",
      hit_count: 0,
      last_hit: "",
      active: true,
    });
    const KW_TYPES = ["제품", "규제", "이벤트", "경쟁사", "동향", "고객명"];
    const SIG_LEVELS = ["high", "medium", "low"];

    const filteredKws = computed(() => {
      const q = kwSearch.value.toLowerCase();
      const all = db.signalKeywords.filter(
        (k) => k.comp_id === selectedCompId.value,
      );
      return all.filter(
        (k) =>
          !q ||
          k.keyword.toLowerCase().includes(q) ||
          (k.trigger_desc || "").toLowerCase().includes(q),
      );
    });

    function startEditKw(k) {
      editingKwId.value = k._id;
      kwDraft.value = { ...k };
    }

    function cancelEditKw() {
      editingKwId.value = null;
    }

    async function commitEditKw() {
      if (!kwDraft.value.keyword?.trim()) return;
      saving.value = true;
      try {
        await db.updateSignalKeyword(editingKwId.value, {
          comp_id: selectedCompId.value,
          ...kwDraft.value,
          hit_count: Number(kwDraft.value.hit_count) || 0,
          active: !!kwDraft.value.active,
        });
        showSaveOk(`'${kwDraft.value.keyword}' 키워드가 업데이트되었습니다 ✓`);
        editingKwId.value = null;
      } catch (e) {
        console.error(e);
        showSaveErr("키워드 저장 실패");
      } finally {
        saving.value = false;
      }
    }

    function openAddKwRow() {
      newKwRow.value = KW_BLANK();
      addingKw.value = true;
    }

    function cancelNewKwRow() {
      addingKw.value = false;
    }

    async function submitNewKwRow() {
      if (!newKwRow.value.keyword?.trim()) return;
      saving.value = true;
      try {
        await db.addSignalKeyword({
          comp_id: selectedCompId.value,
          ...newKwRow.value,
          hit_count: Number(newKwRow.value.hit_count) || 0,
          active: !!newKwRow.value.active,
        });
        showSaveOk(`'${newKwRow.value.keyword}' 키워드가 추가되었습니다 ✓`);
        addingKw.value = false;
      } catch (e) {
        console.error(e);
        showSaveErr("키워드 추가 실패");
      } finally {
        saving.value = false;
      }
    }

    async function deleteKw(_id, name) {
      if (!confirm(`'${name}' 키워드를 삭제하시겠습니까?`)) return;
      saving.value = true;
      try {
        await db.deleteSignalKeyword(_id);
        showSaveOk("키워드가 삭제되었습니다");
      } catch (e) {
        console.error(e);
        showSaveErr("키워드 삭제 실패");
      } finally {
        saving.value = false;
      }
    }

    /* =========================
       ⑥ 신규 고객 후보
    ========================= */
    const prospectSearch = ref("");
    const prospectGrade = ref("");
    const prospectStatus = ref("");
    const editingPrId = ref(null);
    const prDraft = ref({});
    const addingPr = ref(false);
    const newPrRow = ref({});
    const OPP_GRADES = ["high", "medium", "low"];
    const SALES_STATUSES = ["new", "contacted", "qualified", "lost"];
    const SALES_STATUS_KO = {
      new: "신규",
      contacted: "접촉완료",
      qualified: "검증완료",
      lost: "소멸",
    };
    const OPP_GRADE_KO = { high: "HIGH", medium: "MED", low: "LOW" };
    const PR_BLANK = () => ({
      prospect_name: "",
      industry: "",
      signal: "",
      source: "",
      opportunity_grade: "medium",
      ref_url: "",
      detected_at: "",
      sales_status: "new",
      note: "",
    });

    const filteredProspects = computed(() => {
      const q = prospectSearch.value.toLowerCase();
      const g = prospectGrade.value;
      const st = prospectStatus.value;
      return db.prospects
        .filter((p) => p.comp_id === selectedCompId.value)
        .filter((p) => !g || p.opportunity_grade === g)
        .filter((p) => !st || p.sales_status === st)
        .filter(
          (p) =>
            !q ||
            p.prospect_name.toLowerCase().includes(q) ||
            (p.signal || "").toLowerCase().includes(q) ||
            (p.industry || "").toLowerCase().includes(q),
        );
    });

    function startEditPr(p) {
      editingPrId.value = p._id;
      prDraft.value = { ...p };
    }

    function cancelEditPr() {
      editingPrId.value = null;
    }

    async function commitEditPr() {
      if (!prDraft.value.prospect_name?.trim()) return;
      saving.value = true;
      try {
        await db.updateProspect(editingPrId.value, {
          comp_id: selectedCompId.value,
          ...prDraft.value,
        });
        showSaveOk(`'${prDraft.value.prospect_name}' 고객 후보 업데이트 ✓`);
        editingPrId.value = null;
      } catch (e) {
        console.error(e);
        showSaveErr("고객 후보 저장 실패");
      } finally {
        saving.value = false;
      }
    }

    function openAddPrRow() {
      newPrRow.value = PR_BLANK();
      addingPr.value = true;
    }

    function cancelNewPrRow() {
      addingPr.value = false;
    }

    async function submitNewPrRow() {
      if (!newPrRow.value.prospect_name?.trim()) return;
      saving.value = true;
      try {
        await db.addProspect({
          comp_id: selectedCompId.value,
          ...newPrRow.value,
        });
        showSaveOk(
          `'${newPrRow.value.prospect_name}' 고객 후보가 추가되었습니다 ✓`,
        );
        addingPr.value = false;
      } catch (e) {
        console.error(e);
        showSaveErr("고객 후보 추가 실패");
      } finally {
        saving.value = false;
      }
    }

    async function deletePr(_id, name) {
      if (!confirm(`'${name}' 고객 후보를 삭제하시겠습니까?`)) return;
      saving.value = true;
      try {
        await db.deleteProspect(_id);
        showSaveOk("고객 후보가 삭제되었습니다");
      } catch (e) {
        console.error(e);
        showSaveErr("삭제 실패");
      } finally {
        saving.value = false;
      }
    }

    /* =========================
       ⑦ 경쟁사 이슈 출처
    ========================= */
    const ciSrcSearch = ref("");
    const editingCiSrcId = ref(null);
    const ciSrcDraft = ref({});
    const addingCiSrc = ref(false);
    const newCiSrcRow = ref({});
    const CI_SRC_BLANK = () => ({
      priority: 1,
      site_name: "",
      url: "",
      method: "크롤링",
      keywords: "",
      meaning: "",
      active: true,
    });
    const CI_METHOD_OPTIONS = ["API", "크롤링", "크롤링/API", "RSS"];

    const filteredCiSrcs = computed(() => {
      const q = ciSrcSearch.value.toLowerCase();
      const all = db.compIssueSources.filter(
        (s) => s.comp_id === selectedCompId.value,
      );
      return all.filter(
        (s) =>
          !q ||
          s.site_name.toLowerCase().includes(q) ||
          (s.keywords || "").toLowerCase().includes(q),
      );
    });

    function startEditCiSrc(s) {
      editingCiSrcId.value = s._id;
      ciSrcDraft.value = { ...s };
    }

    function cancelEditCiSrc() {
      editingCiSrcId.value = null;
    }

    async function commitEditCiSrc() {
      if (!ciSrcDraft.value.site_name?.trim()) return;
      saving.value = true;
      try {
        await db.updateCompIssueSource(editingCiSrcId.value, {
          comp_id: selectedCompId.value,
          ...ciSrcDraft.value,
          priority: Number(ciSrcDraft.value.priority) || 1,
          active: !!ciSrcDraft.value.active,
        });
        showSaveOk(
          `'${ciSrcDraft.value.site_name}' 이슈 출처가 업데이트되었습니다 ✓`,
        );
        editingCiSrcId.value = null;
      } catch (e) {
        console.error(e);
        showSaveErr("이슈 출처 저장 실패");
      } finally {
        saving.value = false;
      }
    }

    function openAddCiSrcRow() {
      newCiSrcRow.value = CI_SRC_BLANK();
      addingCiSrc.value = true;
    }

    function cancelNewCiSrcRow() {
      addingCiSrc.value = false;
    }

    async function submitNewCiSrcRow() {
      if (!newCiSrcRow.value.site_name?.trim()) return;
      saving.value = true;
      try {
        await db.addCompIssueSource({
          comp_id: selectedCompId.value,
          ...newCiSrcRow.value,
          priority: Number(newCiSrcRow.value.priority) || 1,
          active: !!newCiSrcRow.value.active,
        });
        showSaveOk(
          `'${newCiSrcRow.value.site_name}' 이슈 출처가 추가되었습니다 ✓`,
        );
        addingCiSrc.value = false;
      } catch (e) {
        console.error(e);
        showSaveErr("이슈 출처 추가 실패");
      } finally {
        saving.value = false;
      }
    }

    async function deleteCiSrc(_id, name) {
      if (!confirm(`'${name}' 이슈 출처를 삭제하시겠습니까?`)) return;
      saving.value = true;
      try {
        await db.deleteCompIssueSource(_id);
        showSaveOk("이슈 출처가 삭제되었습니다");
      } catch (e) {
        console.error(e);
        showSaveErr("삭제 실패");
      } finally {
        saving.value = false;
      }
    }

    /* =========================
       ⑧ 경쟁사 이슈 키워드
    ========================= */
    const ciKwSearch = ref("");
    const editingCiKwId = ref(null);
    const ciKwDraft = ref({});
    const addingCiKw = ref(false);
    const newCiKwRow = ref({});
    const CI_KW_BLANK = () => ({
      keyword: "",
      competitor_name: "",
      source_name: "",
      signal_level: "medium",
      hit_count: 0,
      last_hit: "",
      opportunity: "",
      active: true,
    });
    const CI_SIG_LEVELS = ["high", "medium", "low"];

    const filteredCiKws = computed(() => {
      const q = ciKwSearch.value.toLowerCase();
      const all = db.compIssueKeywords.filter(
        (k) => k.comp_id === selectedCompId.value,
      );
      return all.filter(
        (k) =>
          !q ||
          k.keyword.toLowerCase().includes(q) ||
          (k.source_name || "").toLowerCase().includes(q),
      );
    });

    function startEditCiKw(k) {
      editingCiKwId.value = k._id;
      ciKwDraft.value = { ...k };
    }

    function cancelEditCiKw() {
      editingCiKwId.value = null;
    }

    async function commitEditCiKw() {
      if (!ciKwDraft.value.keyword?.trim()) return;
      saving.value = true;
      try {
        await db.updateCompIssueKeyword(editingCiKwId.value, {
          comp_id: selectedCompId.value,
          ...ciKwDraft.value,
          hit_count: Number(ciKwDraft.value.hit_count) || 0,
          active: !!ciKwDraft.value.active,
        });
        showSaveOk(
          `'${ciKwDraft.value.keyword}' 이슈 키워드가 업데이트되었습니다 ✓`,
        );
        editingCiKwId.value = null;
      } catch (e) {
        console.error(e);
        showSaveErr("이슈 키워드 저장 실패");
      } finally {
        saving.value = false;
      }
    }

    function openAddCiKwRow() {
      newCiKwRow.value = CI_KW_BLANK();
      addingCiKw.value = true;
    }

    function cancelNewCiKwRow() {
      addingCiKw.value = false;
    }

    async function submitNewCiKwRow() {
      if (!newCiKwRow.value.keyword?.trim()) return;
      saving.value = true;
      try {
        await db.addCompIssueKeyword({
          comp_id: selectedCompId.value,
          ...newCiKwRow.value,
          hit_count: Number(newCiKwRow.value.hit_count) || 0,
          active: !!newCiKwRow.value.active,
        });
        showSaveOk(
          `'${newCiKwRow.value.keyword}' 이슈 키워드가 추가되었습니다 ✓`,
        );
        addingCiKw.value = false;
      } catch (e) {
        console.error(e);
        showSaveErr("이슈 키워드 추가 실패");
      } finally {
        saving.value = false;
      }
    }

    async function deleteCiKw(_id, name) {
      if (!confirm(`'${name}' 이슈 키워드를 삭제하시겠습니까?`)) return;
      saving.value = true;
      try {
        await db.deleteCompIssueKeyword(_id);
        showSaveOk("이슈 키워드가 삭제되었습니다");
      } catch (e) {
        console.error(e);
        showSaveErr("삭제 실패");
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => {
      db.loadAll(true);
      if (route.query.tab && VALID_ADMIN_TABS.includes(route.query.tab)) {
        adminTab.value = route.query.tab;
      }

      // ── Socket.io 실시간 알림 연결 ──
      const BACKEND_URL = "https://emotion-ai-backend-bfdc.onrender.com";

      if (typeof io !== "undefined") {
        const socket = io(BACKEND_URL, { transports: ["websocket"] });

        socket.on("connect", () => {
          console.log("[Socket.io] 연결 완료:", socket.id);
          // tenant_id 기반 room 입장
          socket.emit("join_room", { tenant_id: 7 });
        });

        socket.on("new_alert", (data) => {
          console.log("[Socket.io] 새 알림 수신:", data);

          // category → severity 변환
          const severityMap = {
            "긴급": "critical",
            "주의": "warning",
            "일반": "info",
          };
          const severity = severityMap[data.category] || "info";

          // ALERT_STORE에 추가 → AlertPanel 자동 업데이트
          ALERT_STORE.add({
            severity,
            title: data.message || "새 알림이 감지되었습니다.",
            companyName: data.company_name || "",
            tabLabel: data.signal_type_label || "",
            keyword: data.keyword || "",
            desc: data.message || "",
            dupKey: `socket-${Date.now()}`,
          });

          // 패널 자동으로 열기
          ALERT_STORE.showPanel = true;
        });

        socket.on("disconnect", () => {
          console.log("[Socket.io] 연결 해제");
        });
      } else {
        console.warn("[Socket.io] io 라이브러리를 찾을 수 없습니다.");
      }
    });

    watch(
      () => route.query.tab,
      (newTab) => {
        if (newTab && VALID_ADMIN_TABS.includes(newTab))
          adminTab.value = newTab;
      },
    );

    return {
      router,
      adminTab,
      db,
      saving,
      saveMsg,
      selectedCompId,
      B2B_COMPANIES,

      compSearch,
      filteredComps,
      editingCompId,
      compDraft,
      startEditComp,
      commitEditComp,
      cancelEditComp,
      addingComp,
      newCompRow,
      openAddCompRow,
      submitNewCompRow,
      cancelNewCompRow,
      deleteComp,

      custSearch,
      custGrade,
      filteredCust,
      editingCustId,
      custDraft,
      startEditCust,
      commitEditCust,
      cancelEditCust,
      addingCust,
      newCustRow,
      openAddCustRow,
      submitNewCustRow,
      cancelNewCustRow,
      deleteCust,

      TAB_LABELS,
      TAB_IDS,
      STATUS_CONFIG,
      getTabStatus,
      setTabStatus,
      GLOBAL_TAB_STATUSES,
      wipCount,
      disabledCount,

      srcSearch,
      filteredSrcs,
      editingSrcId,
      srcDraft,
      startEditSrc,
      commitEditSrc,
      cancelEditSrc,
      addingSrc,
      newSrcRow,
      openAddSrcRow,
      submitNewSrcRow,
      cancelNewSrcRow,
      deleteSrc,
      METHOD_OPTIONS,
      CATEGORY_OPTIONS,

      kwSearch,
      filteredKws,
      editingKwId,
      kwDraft,
      startEditKw,
      commitEditKw,
      cancelEditKw,
      addingKw,
      newKwRow,
      openAddKwRow,
      submitNewKwRow,
      cancelNewKwRow,
      deleteKw,
      KW_TYPES,
      SIG_LEVELS,

      prospectSearch,
      prospectGrade,
      prospectStatus,
      filteredProspects,
      editingPrId,
      prDraft,
      startEditPr,
      commitEditPr,
      cancelEditPr,
      addingPr,
      newPrRow,
      openAddPrRow,
      submitNewPrRow,
      cancelNewPrRow,
      deletePr,
      OPP_GRADES,
      SALES_STATUSES,
      SALES_STATUS_KO,
      OPP_GRADE_KO,

      ciSrcSearch,
      filteredCiSrcs,
      editingCiSrcId,
      ciSrcDraft,
      startEditCiSrc,
      commitEditCiSrc,
      cancelEditCiSrc,
      addingCiSrc,
      newCiSrcRow,
      openAddCiSrcRow,
      submitNewCiSrcRow,
      cancelNewCiSrcRow,
      deleteCiSrc,
      CI_METHOD_OPTIONS,

      ciKwSearch,
      filteredCiKws,
      editingCiKwId,
      ciKwDraft,
      startEditCiKw,
      commitEditCiKw,
      cancelEditCiKw,
      addingCiKw,
      newCiKwRow,
      openAddCiKwRow,
      submitNewCiKwRow,
      cancelNewCiKwRow,
      deleteCiKw,
      CI_SIG_LEVELS,

      GRADE_COLORS,
      SEG_OPTIONS,
      scoreColor,
    };
  },

  template: `
  <div>
    <NavBar page="admin"/>
    <AlertPanel/>

    <div v-if="db._loading && !db._loaded" class="adm-loading-overlay">
      <div class="adm-loading-box">
        <div class="adm-loading-spinner"></div>
        <div class="adm-loading-title">Admin 데이터 로딩 중</div>
        <div class="adm-loading-sub">DB에서 최신 데이터를 가져오고 있습니다…</div>
      </div>
    </div>

    <transition name="adm-toast-fade">
      <div
        v-if="saveMsg"
        class="adm-save-toast"
        :class="saveMsg.startsWith('⚠') ? 'adm-toast-err' : 'adm-toast-ok'"
      >
        {{saveMsg}}
      </div>
    </transition>

    <div class="page-shell">
      <div class="page-body">
        <div class="admin-hero">
          <div style="flex:1;min-width:0">
            <div class="admin-eyebrow">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Admin · 데이터 관리
            </div>

            <h1 class="admin-hero-h1">경쟁사 · 고객 · 탭 상태 관리</h1>
            <p class="admin-hero-sub">Database 연동 — 테이블에서 직접 수정하면 B2B 분석 화면에 즉시 반영됩니다</p>

            <div class="adm-comp-selector">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"/>
              </svg>
              관리 대상:
              <select v-model="selectedCompId" class="adm-comp-select">
                <option v-for="c in B2B_COMPANIES" :key="c.id" :value="c.id">{{c.name}}</option>
              </select>
            </div>

            <div class="admin-hero-stats">
              <div class="admin-stat-item">
                <div class="admin-stat-num">{{db.competitors.filter(c=>c.comp_id===selectedCompId).length}}</div>
                <div class="admin-stat-lbl">등록 경쟁사</div>
              </div>
              <div class="admin-stat-item">
                <div class="admin-stat-num">{{db.customers.filter(c=>c.comp_id===selectedCompId).length}}</div>
                <div class="admin-stat-lbl">등록 고객</div>
              </div>
              <div class="admin-stat-item">
                <div class="admin-stat-num" style="color:#4ade80">{{db.dataSources.filter(d=>d.comp_id===selectedCompId&&d.active).length}}</div>
                <div class="admin-stat-lbl">활성 수집 원천</div>
              </div>
              <div class="admin-stat-item">
                <div class="admin-stat-num" style="color:#fbbf24">{{db.signalKeywords.filter(k=>k.comp_id===selectedCompId&&k.active).length}}</div>
                <div class="admin-stat-lbl">시그널 키워드</div>
              </div>
              <div class="admin-stat-item">
                <div class="admin-stat-num" style="color:#f43f5e">{{db.prospects.filter(p=>p.comp_id===selectedCompId&&p.opportunity_grade==='high').length}}</div>
                <div class="admin-stat-lbl">HIGH 영업기회</div>
              </div>
              <div class="admin-stat-item">
                <div class="admin-stat-num" style="color:#fb7185">{{db.compIssueSources.filter(s=>s.comp_id===selectedCompId&&s.active).length}}</div>
                <div class="admin-stat-lbl">이슈 탐지 출처</div>
              </div>
              <div class="admin-stat-item">
                <div class="admin-stat-num" style="color:#f97316">{{db.compIssueKeywords.filter(k=>k.comp_id===selectedCompId&&k.active).length}}</div>
                <div class="admin-stat-lbl">이슈 키워드</div>
              </div>
              <div class="admin-stat-item">
                <div class="admin-stat-num" style="color:#fde68a">{{wipCount}}</div>
                <div class="admin-stat-lbl">작업중 탭</div>
              </div>
              <div class="admin-stat-item">
                <div class="admin-stat-num" style="color:#94a3b8">{{disabledCount}}</div>
                <div class="admin-stat-lbl">미연동 탭</div>
              </div>
            </div>
          </div>

          <button class="admin-hero-back" @click="router.push('/B2B')">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M11 17l-5-5m0 0l5-5m-5 5h12"/>
            </svg>
            대시보드로 돌아가기
          </button>
        </div>

        <div class="admin-tab-bar">
          <button :class="['admin-tab-btn', adminTab==='competitors'?'active':'']" @click="adminTab='competitors'">
            경쟁사 관리
            <span class="admin-tab-cnt">{{db.competitors.filter(c=>c.comp_id===selectedCompId).length}}</span>
          </button>
          <button :class="['admin-tab-btn', adminTab==='customers'?'active':'']" @click="adminTab='customers'">
            고객 관리
            <span class="admin-tab-cnt">{{db.customers.filter(c=>c.comp_id===selectedCompId).length}}</span>
          </button>
          <button :class="['admin-tab-btn', adminTab==='datasources'?'active':'']" @click="adminTab='datasources'">
            수집 원천 관리
            <span class="admin-tab-cnt">{{db.dataSources.filter(d=>d.comp_id===selectedCompId).length}}</span>
          </button>
          <button :class="['admin-tab-btn', adminTab==='keywords'?'active':'']" @click="adminTab='keywords'">
            시그널 키워드
            <span class="admin-tab-cnt">{{db.signalKeywords.filter(k=>k.comp_id===selectedCompId).length}}</span>
          </button>
          <button :class="['admin-tab-btn', adminTab==='prospects'?'active':'']" @click="adminTab='prospects'">
            신규 고객 후보
            <span class="admin-tab-cnt">{{db.prospects.filter(p=>p.comp_id===selectedCompId).length}}</span>
          </button>
          <button :class="['admin-tab-btn', adminTab==='ci_sources'?'active':'']" @click="adminTab='ci_sources'">
            이슈 탐지 출처
            <span class="admin-tab-cnt">{{db.compIssueSources.filter(s=>s.comp_id===selectedCompId).length}}</span>
          </button>
          <button :class="['admin-tab-btn', adminTab==='ci_keywords'?'active':'']" @click="adminTab='ci_keywords'">
            이슈 키워드
            <span class="admin-tab-cnt">{{db.compIssueKeywords.filter(k=>k.comp_id===selectedCompId).length}}</span>
          </button>
          <button :class="['admin-tab-btn', adminTab==='tabstatus'?'active':'']" @click="adminTab='tabstatus'">
            탭 상태 관리
            <span class="admin-tab-cnt">{{B2B_COMPANIES.length}}</span>
          </button>
        </div>

        <!-- competitors -->
        <div v-if="adminTab==='competitors'" class="adm-section">
          <div class="adm-toolbar">
            <div class="adm-toolbar-left">
              <div class="adm-search-box">
                <input v-model="compSearch" placeholder="기업명·업종 검색…" />
              </div>
            </div>
            <button class="adm-add-btn" @click="openAddCompRow">경쟁사 추가</button>
          </div>

          <div class="adm-table-card">
            <div class="adm-table-scroll">
              <table class="adm-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>기업명</th>
                    <th>업종</th>
                    <th>CX 점수</th>
                    <th>긍정 감성%</th>
                    <th>Google ★</th>
                    <th>NPS</th>
                    <th>메모</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!db._loaded">
                    <td colspan="9" style="text-align:center;padding:24px;color:var(--text-4)">DB에서 데이터를 불러오는 중...</td>
                  </tr>

                  <template v-else v-for="c in filteredComps" :key="c._id">
                    <tr v-if="editingCompId !== c._id" class="adm-tr adm-tr-view">
                      <td><span class="adm-color-dot" :style="{background:c.color}"></span></td>
                      <td>{{c.name}}</td>
                      <td>{{c.industry||'—'}}</td>
                      <td><span class="adm-pill" :style="{color:scoreColor(c.score),background:scoreColor(c.score)+'1a'}">{{c.score}}</span></td>
                      <td><span class="adm-pill" :style="{color:scoreColor(c.sentiment),background:scoreColor(c.sentiment)+'1a'}">{{c.sentiment}}%</span></td>
                      <td>{{c.googleRating}}</td>
                      <td>{{c.nps}}</td>
                      <td>{{c.note||'—'}}</td>
                      <td class="adm-td-act">
                        <button class="adm-btn-icon adm-btn-edit" @click.stop="startEditComp(c)">✏️</button>
                        <button class="adm-btn-icon adm-btn-del" @click.stop="deleteComp(c._id)">🗑</button>
                      </td>
                    </tr>

                    <tr v-else class="adm-tr adm-tr-edit">
                      <td><input type="color" v-model="compDraft.color" class="adm-color-picker"/></td>
                      <td><input v-model="compDraft.name" class="adm-cell-in" placeholder="기업명 *"/></td>
                      <td><input v-model="compDraft.industry" class="adm-cell-in" placeholder="업종"/></td>
                      <td><input type="number" v-model.number="compDraft.score" class="adm-cell-in adm-cell-num"/></td>
                      <td><input type="number" v-model.number="compDraft.sentiment" class="adm-cell-in adm-cell-num"/></td>
                      <td><input type="number" v-model.number="compDraft.googleRating" class="adm-cell-in adm-cell-num"/></td>
                      <td><input type="number" v-model.number="compDraft.nps" class="adm-cell-in adm-cell-num"/></td>
                      <td><input v-model="compDraft.note" class="adm-cell-in" placeholder="메모"/></td>
                      <td class="adm-td-act">
                        <button class="adm-btn-icon adm-btn-save" @click="commitEditComp">✅</button>
                        <button class="adm-btn-icon adm-btn-cancel" @click="cancelEditComp">✖</button>
                      </td>
                    </tr>
                  </template>

                  <tr v-if="addingComp" class="adm-tr adm-tr-new">
                    <td><input type="color" v-model="newCompRow.color" class="adm-color-picker"/></td>
                    <td><input v-model="newCompRow.name" class="adm-cell-in" placeholder="기업명 *"/></td>
                    <td><input v-model="newCompRow.industry" class="adm-cell-in" placeholder="업종"/></td>
                    <td><input type="number" v-model.number="newCompRow.score" class="adm-cell-in adm-cell-num"/></td>
                    <td><input type="number" v-model.number="newCompRow.sentiment" class="adm-cell-in adm-cell-num"/></td>
                    <td><input type="number" v-model.number="newCompRow.googleRating" class="adm-cell-in adm-cell-num"/></td>
                    <td><input type="number" v-model.number="newCompRow.nps" class="adm-cell-in adm-cell-num"/></td>
                    <td><input v-model="newCompRow.note" class="adm-cell-in" placeholder="메모"/></td>
                    <td class="adm-td-act">
                      <button class="adm-btn-icon adm-btn-save" @click="submitNewCompRow">✅</button>
                      <button class="adm-btn-icon adm-btn-cancel" @click="cancelNewCompRow">✖</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- customers -->
        <div v-if="adminTab==='customers'" class="adm-section">
          <div class="adm-toolbar">
            <div class="adm-toolbar-left">
              <div class="adm-search-box">
                <input v-model="custSearch" placeholder="고객명·기업명·이메일 검색…" />
              </div>
              <select v-model="custGrade" class="adm-filter-select">
                <option value="ALL">전체 등급</option>
                <option value="VIP">VIP</option>
                <option value="우수">우수</option>
                <option value="일반">일반</option>
              </select>
            </div>
            <button class="adm-add-btn" @click="openAddCustRow">고객 추가</button>
          </div>

          <div class="adm-table-card">
            <div class="adm-table-scroll">
              <table class="adm-table">
                <thead>
                  <tr>
                    <th>고객 (담당자)</th>
                    <th>기업명</th>
                    <th>연락처</th>
                    <th>이메일</th>
                    <th>등급</th>
                    <th>세그먼트</th>
                    <th>메모</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="c in filteredCust" :key="c._id">
                    <tr v-if="editingCustId !== c._id" class="adm-tr adm-tr-view">
                      <td>{{c.name}}</td>
                      <td>{{c.company}}</td>
                      <td>{{c.contact||'—'}}</td>
                      <td>{{c.email||'—'}}</td>
                      <td>{{c.grade}}</td>
                      <td>{{c.segment}}</td>
                      <td>{{c.note||'—'}}</td>
                      <td class="adm-td-act">
                        <button class="adm-btn-icon adm-btn-edit" @click.stop="startEditCust(c)">✏️</button>
                        <button class="adm-btn-icon adm-btn-del" @click.stop="deleteCust(c._id)">🗑</button>
                      </td>
                    </tr>

                    <tr v-else class="adm-tr adm-tr-edit">
                      <td><input v-model="custDraft.name" class="adm-cell-in" placeholder="담당자명 *"/></td>
                      <td><input v-model="custDraft.company" class="adm-cell-in" placeholder="기업명"/></td>
                      <td><input v-model="custDraft.contact" class="adm-cell-in" placeholder="연락처"/></td>
                      <td><input v-model="custDraft.email" class="adm-cell-in" placeholder="이메일"/></td>
                      <td>
                        <select v-model="custDraft.grade" class="adm-cell-in adm-cell-sel">
                          <option>VIP</option><option>우수</option><option>일반</option>
                        </select>
                      </td>
                      <td>
                        <select v-model="custDraft.segment" class="adm-cell-in adm-cell-sel">
                          <option v-for="s in SEG_OPTIONS" :key="s">{{s}}</option>
                        </select>
                      </td>
                      <td><input v-model="custDraft.note" class="adm-cell-in" placeholder="메모"/></td>
                      <td class="adm-td-act">
                        <button class="adm-btn-icon adm-btn-save" @click="commitEditCust">✅</button>
                        <button class="adm-btn-icon adm-btn-cancel" @click="cancelEditCust">✖</button>
                      </td>
                    </tr>
                  </template>

                  <tr v-if="addingCust" class="adm-tr adm-tr-new">
                    <td><input v-model="newCustRow.name" class="adm-cell-in" placeholder="담당자명 *"/></td>
                    <td><input v-model="newCustRow.company" class="adm-cell-in" placeholder="기업명"/></td>
                    <td><input v-model="newCustRow.contact" class="adm-cell-in" placeholder="연락처"/></td>
                    <td><input v-model="newCustRow.email" class="adm-cell-in" placeholder="이메일"/></td>
                    <td>
                      <select v-model="newCustRow.grade" class="adm-cell-in adm-cell-sel">
                        <option>VIP</option><option>우수</option><option>일반</option>
                      </select>
                    </td>
                    <td>
                      <select v-model="newCustRow.segment" class="adm-cell-in adm-cell-sel">
                        <option v-for="s in SEG_OPTIONS" :key="s">{{s}}</option>
                      </select>
                    </td>
                    <td><input v-model="newCustRow.note" class="adm-cell-in" placeholder="메모"/></td>
                    <td class="adm-td-act">
                      <button class="adm-btn-icon adm-btn-save" @click="submitNewCustRow">✅</button>
                      <button class="adm-btn-icon adm-btn-cancel" @click="cancelNewCustRow">✖</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- datasources -->
        <div v-if="adminTab==='datasources'" class="adm-section">
          <div class="adm-toolbar">
            <div class="adm-toolbar-left">
              <div class="adm-search-box">
                <input v-model="srcSearch" placeholder="사이트명·키워드 검색…" />
              </div>
            </div>
            <button class="adm-add-btn" @click="openAddSrcRow">원천 추가</button>
          </div>

          <div class="adm-table-card">
            <div class="adm-table-scroll">
              <table class="adm-table">
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>사이트명</th>
                    <th>URL</th>
                    <th>방법</th>
                    <th>키워드</th>
                    <th>카테고리</th>
                    <th>목적/의미</th>
                    <th>활성</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="s in filteredSrcs" :key="s._id">
                    <tr v-if="editingSrcId !== s._id" class="adm-tr adm-tr-view">
                      <td>{{s.priority}}</td>
                      <td>{{s.site_name}}</td>
                      <td>{{s.url}}</td>
                      <td>{{s.method}}</td>
                      <td>{{s.keywords}}</td>
                      <td>{{s.category}}</td>
                      <td>{{s.purpose}}</td>
                      <td>{{s.active ? '활성' : '꺼짐'}}</td>
                      <td class="adm-td-act">
                        <button class="adm-btn-icon adm-btn-edit" @click.stop="startEditSrc(s)">✏️</button>
                        <button class="adm-btn-icon adm-btn-del" @click.stop="deleteSrc(s._id, s.site_name)">🗑</button>
                      </td>
                    </tr>

                    <tr v-else class="adm-tr adm-tr-edit">
                      <td><input v-model="srcDraft.priority" type="number" class="adm-input" style="width:48px"/></td>
                      <td><input v-model="srcDraft.site_name" class="adm-input" placeholder="사이트명"/></td>
                      <td><input v-model="srcDraft.url" class="adm-input" placeholder="https://…"/></td>
                      <td>
                        <select v-model="srcDraft.method" class="adm-input">
                          <option v-for="m in METHOD_OPTIONS" :key="m" :value="m">{{m}}</option>
                        </select>
                      </td>
                      <td><input v-model="srcDraft.keywords" class="adm-input" placeholder="키워드1, 키워드2"/></td>
                      <td>
                        <select v-model="srcDraft.category" class="adm-input">
                          <option v-for="c in CATEGORY_OPTIONS" :key="c" :value="c">{{c}}</option>
                        </select>
                      </td>
                      <td><input v-model="srcDraft.purpose" class="adm-input" placeholder="목적/의미"/></td>
                      <td><input type="checkbox" v-model="srcDraft.active"/></td>
                      <td class="adm-td-act">
                        <button class="adm-btn-icon adm-btn-save" @click.stop="commitEditSrc">✅</button>
                        <button class="adm-btn-icon adm-btn-cancel" @click.stop="cancelEditSrc">✖</button>
                      </td>
                    </tr>
                  </template>

                  <tr v-if="addingSrc" class="adm-tr adm-tr-edit">
                    <td><input v-model="newSrcRow.priority" type="number" class="adm-input" style="width:48px"/></td>
                    <td><input v-model="newSrcRow.site_name" class="adm-input" placeholder="사이트명 *"/></td>
                    <td><input v-model="newSrcRow.url" class="adm-input" placeholder="https://…"/></td>
                    <td>
                      <select v-model="newSrcRow.method" class="adm-input">
                        <option v-for="m in METHOD_OPTIONS" :key="m" :value="m">{{m}}</option>
                      </select>
                    </td>
                    <td><input v-model="newSrcRow.keywords" class="adm-input" placeholder="키워드1, 키워드2"/></td>
                    <td>
                      <select v-model="newSrcRow.category" class="adm-input">
                        <option v-for="c in CATEGORY_OPTIONS" :key="c" :value="c">{{c}}</option>
                      </select>
                    </td>
                    <td><input v-model="newSrcRow.purpose" class="adm-input" placeholder="목적/의미"/></td>
                    <td><input type="checkbox" v-model="newSrcRow.active"/></td>
                    <td class="adm-td-act">
                      <button class="adm-btn-icon adm-btn-save" @click.stop="submitNewSrcRow">✅</button>
                      <button class="adm-btn-icon adm-btn-cancel" @click.stop="cancelNewSrcRow">✖</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- keywords -->
        <div v-if="adminTab==='keywords'" class="adm-section">
          <div class="adm-toolbar">
            <div class="adm-toolbar-left">
              <div class="adm-search-box">
                <input v-model="kwSearch" placeholder="키워드·트리거 검색…" />
              </div>
            </div>
            <button class="adm-add-btn" @click="openAddKwRow">키워드 추가</button>
          </div>

          <div class="adm-table-card">
            <div class="adm-table-scroll">
              <table class="adm-table">
                <thead>
                  <tr>
                    <th>키워드</th>
                    <th>유형</th>
                    <th>신호 강도</th>
                    <th>트리거 조건</th>
                    <th>히트수</th>
                    <th>최근 탐지</th>
                    <th>활성</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="k in filteredKws" :key="k._id">
                    <tr v-if="editingKwId !== k._id" class="adm-tr adm-tr-view">
                      <td>{{k.keyword}}</td>
                      <td>{{k.kw_type}}</td>
                      <td>{{k.signal_level}}</td>
                      <td>{{k.trigger_desc}}</td>
                      <td>{{k.hit_count||0}}</td>
                      <td>{{k.last_hit||'—'}}</td>
                      <td>{{k.active ? '활성' : '꺼짐'}}</td>
                      <td class="adm-td-act">
                        <button class="adm-btn-icon adm-btn-edit" @click.stop="startEditKw(k)">✏️</button>
                        <button class="adm-btn-icon adm-btn-del" @click.stop="deleteKw(k._id, k.keyword)">🗑</button>
                      </td>
                    </tr>

                    <tr v-else class="adm-tr adm-tr-edit">
                      <td><input v-model="kwDraft.keyword" class="adm-input" placeholder="키워드 *"/></td>
                      <td>
                        <select v-model="kwDraft.kw_type" class="adm-input">
                          <option v-for="t in KW_TYPES" :key="t" :value="t">{{t}}</option>
                        </select>
                      </td>
                      <td>
                        <select v-model="kwDraft.signal_level" class="adm-input">
                          <option v-for="l in SIG_LEVELS" :key="l" :value="l">{{l}}</option>
                        </select>
                      </td>
                      <td><input v-model="kwDraft.trigger_desc" class="adm-input" placeholder="트리거 조건…"/></td>
                      <td><input v-model="kwDraft.hit_count" type="number" class="adm-input" style="width:64px"/></td>
                      <td><input v-model="kwDraft.last_hit" class="adm-input" placeholder="YYYY-MM-DD"/></td>
                      <td><input type="checkbox" v-model="kwDraft.active"/></td>
                      <td class="adm-td-act">
                        <button class="adm-btn-icon adm-btn-save" @click.stop="commitEditKw">✅</button>
                        <button class="adm-btn-icon adm-btn-cancel" @click.stop="cancelEditKw">✖</button>
                      </td>
                    </tr>
                  </template>

                  <tr v-if="addingKw" class="adm-tr adm-tr-edit">
                    <td><input v-model="newKwRow.keyword" class="adm-input" placeholder="키워드 *"/></td>
                    <td>
                      <select v-model="newKwRow.kw_type" class="adm-input">
                        <option v-for="t in KW_TYPES" :key="t" :value="t">{{t}}</option>
                      </select>
                    </td>
                    <td>
                      <select v-model="newKwRow.signal_level" class="adm-input">
                        <option v-for="l in SIG_LEVELS" :key="l" :value="l">{{l}}</option>
                      </select>
                    </td>
                    <td><input v-model="newKwRow.trigger_desc" class="adm-input" placeholder="트리거 조건…"/></td>
                    <td><input v-model="newKwRow.hit_count" type="number" class="adm-input" style="width:64px"/></td>
                    <td><input v-model="newKwRow.last_hit" class="adm-input" placeholder="YYYY-MM-DD"/></td>
                    <td><input type="checkbox" v-model="newKwRow.active"/></td>
                    <td class="adm-td-act">
                      <button class="adm-btn-icon adm-btn-save" @click.stop="submitNewKwRow">✅</button>
                      <button class="adm-btn-icon adm-btn-cancel" @click.stop="cancelNewKwRow">✖</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- prospects -->
        <div v-if="adminTab==='prospects'" class="adm-section">
          <div class="adm-toolbar">
            <div class="adm-toolbar-left" style="flex-wrap:wrap;gap:8px">
              <div class="adm-search-box">
                <input v-model="prospectSearch" placeholder="기업명·시그널 검색…" />
              </div>
              <select v-model="prospectGrade" class="adm-input" style="width:110px">
                <option value="">전체 등급</option>
                <option value="high">🔴 HIGH</option>
                <option value="medium">🟡 MED</option>
                <option value="low">⚪ LOW</option>
              </select>
              <select v-model="prospectStatus" class="adm-input" style="width:110px">
                <option value="">전체 상태</option>
                <option value="new">신규</option>
                <option value="contacted">접촉완료</option>
                <option value="qualified">검증완료</option>
                <option value="lost">소멸</option>
              </select>
            </div>
            <button class="adm-add-btn" @click="openAddPrRow">후보 추가</button>
          </div>

          <div class="adm-table-card">
            <div class="adm-table-scroll">
              <table class="adm-table">
                <thead>
                  <tr>
                    <th>등급</th>
                    <th>기업명</th>
                    <th>업종</th>
                    <th>탐지 시그널</th>
                    <th>정보원</th>
                    <th>탐지일</th>
                    <th>영업 상태</th>
                    <th>메모</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="p in filteredProspects" :key="p._id">
                    <tr v-if="editingPrId !== p._id" class="adm-tr adm-tr-view">
                      <td>{{OPP_GRADE_KO[p.opportunity_grade]||p.opportunity_grade}}</td>
                      <td>{{p.prospect_name}}</td>
                      <td>{{p.industry}}</td>
                      <td>{{p.signal}}</td>
                      <td>{{p.source}}</td>
                      <td>{{p.detected_at}}</td>
                      <td>{{SALES_STATUS_KO[p.sales_status]||p.sales_status}}</td>
                      <td>{{p.note}}</td>
                      <td class="adm-td-act">
                        <button class="adm-btn-icon adm-btn-edit" @click.stop="startEditPr(p)">✏️</button>
                        <button class="adm-btn-icon adm-btn-del" @click.stop="deletePr(p._id, p.prospect_name)">🗑</button>
                      </td>
                    </tr>

                    <tr v-else class="adm-tr adm-tr-edit">
                      <td>
                        <select v-model="prDraft.opportunity_grade" class="adm-input" style="width:80px">
                          <option v-for="g in OPP_GRADES" :key="g" :value="g">{{OPP_GRADE_KO[g]}}</option>
                        </select>
                      </td>
                      <td><input v-model="prDraft.prospect_name" class="adm-input" placeholder="기업명 *"/></td>
                      <td><input v-model="prDraft.industry" class="adm-input" placeholder="업종"/></td>
                      <td><input v-model="prDraft.signal" class="adm-input" placeholder="탐지 시그널"/></td>
                      <td><input v-model="prDraft.source" class="adm-input" placeholder="정보원"/></td>
                      <td><input v-model="prDraft.detected_at" class="adm-input" placeholder="YYYY-MM-DD"/></td>
                      <td>
                        <select v-model="prDraft.sales_status" class="adm-input">
                          <option v-for="s in SALES_STATUSES" :key="s" :value="s">{{SALES_STATUS_KO[s]}}</option>
                        </select>
                      </td>
                      <td><input v-model="prDraft.note" class="adm-input" placeholder="메모"/></td>
                      <td class="adm-td-act">
                        <button class="adm-btn-icon adm-btn-save" @click.stop="commitEditPr">✅</button>
                        <button class="adm-btn-icon adm-btn-cancel" @click.stop="cancelEditPr">✖</button>
                      </td>
                    </tr>
                  </template>

                  <tr v-if="addingPr" class="adm-tr adm-tr-edit">
                    <td>
                      <select v-model="newPrRow.opportunity_grade" class="adm-input" style="width:80px">
                        <option v-for="g in OPP_GRADES" :key="g" :value="g">{{OPP_GRADE_KO[g]}}</option>
                      </select>
                    </td>
                    <td><input v-model="newPrRow.prospect_name" class="adm-input" placeholder="기업명 *"/></td>
                    <td><input v-model="newPrRow.industry" class="adm-input" placeholder="업종"/></td>
                    <td><input v-model="newPrRow.signal" class="adm-input" placeholder="탐지 시그널"/></td>
                    <td><input v-model="newPrRow.source" class="adm-input" placeholder="정보원"/></td>
                    <td><input v-model="newPrRow.detected_at" class="adm-input" placeholder="YYYY-MM-DD"/></td>
                    <td>
                      <select v-model="newPrRow.sales_status" class="adm-input">
                        <option v-for="s in SALES_STATUSES" :key="s" :value="s">{{SALES_STATUS_KO[s]}}</option>
                      </select>
                    </td>
                    <td><input v-model="newPrRow.note" class="adm-input" placeholder="메모"/></td>
                    <td class="adm-td-act">
                      <button class="adm-btn-icon adm-btn-save" @click.stop="submitNewPrRow">✅</button>
                      <button class="adm-btn-icon adm-btn-cancel" @click.stop="cancelNewPrRow">✖</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ci_sources -->
        <div v-if="adminTab==='ci_sources'" class="adm-section">
          <div class="adm-toolbar">
            <div class="adm-toolbar-left">
              <div class="adm-search-box">
                <input v-model="ciSrcSearch" placeholder="사이트명·키워드 검색…" />
              </div>
            </div>
            <button class="adm-add-btn" @click="openAddCiSrcRow">출처 추가</button>
          </div>

          <div class="adm-table-card">
            <div class="adm-table-scroll">
              <table class="adm-table">
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>사이트명</th>
                    <th>URL</th>
                    <th>수집 방법</th>
                    <th>핵심 키워드</th>
                    <th>의미/설명</th>
                    <th>상태</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="s in filteredCiSrcs" :key="s._id">
                    <tr v-if="editingCiSrcId !== s._id" class="adm-tr adm-tr-view">
                      <td>{{s.priority}}</td>
                      <td>{{s.site_name}}</td>
                      <td>{{s.url}}</td>
                      <td>{{s.method}}</td>
                      <td>{{s.keywords||'—'}}</td>
                      <td>{{s.meaning||'—'}}</td>
                      <td>{{s.active ? '활성' : '비활성'}}</td>
                      <td class="adm-td-act">
                        <button class="adm-btn-icon adm-btn-edit" @click.stop="startEditCiSrc(s)">✏️</button>
                        <button class="adm-btn-icon adm-btn-del" @click.stop="deleteCiSrc(s._id, s.site_name)">🗑</button>
                      </td>
                    </tr>

                    <tr v-else class="adm-tr adm-tr-edit">
                      <td><input type="number" v-model.number="ciSrcDraft.priority" class="adm-cell-in adm-cell-num" style="width:50px"/></td>
                      <td><input v-model="ciSrcDraft.site_name" class="adm-cell-in" placeholder="사이트명 *"/></td>
                      <td><input v-model="ciSrcDraft.url" class="adm-cell-in" placeholder="https://…"/></td>
                      <td>
                        <select v-model="ciSrcDraft.method" class="adm-cell-in">
                          <option v-for="m in CI_METHOD_OPTIONS" :key="m" :value="m">{{m}}</option>
                        </select>
                      </td>
                      <td><input v-model="ciSrcDraft.keywords" class="adm-cell-in" placeholder="리콜,품질,불량…"/></td>
                      <td><input v-model="ciSrcDraft.meaning" class="adm-cell-in" placeholder="의미/설명"/></td>
                      <td><input type="checkbox" v-model="ciSrcDraft.active"/></td>
                      <td class="adm-td-act">
                        <button class="adm-btn-icon adm-btn-save" @click.stop="commitEditCiSrc">✅</button>
                        <button class="adm-btn-icon adm-btn-cancel" @click.stop="cancelEditCiSrc">✖</button>
                      </td>
                    </tr>
                  </template>

                  <tr v-if="addingCiSrc" class="adm-tr adm-tr-edit">
                    <td><input type="number" v-model.number="newCiSrcRow.priority" class="adm-cell-in adm-cell-num" style="width:50px"/></td>
                    <td><input v-model="newCiSrcRow.site_name" class="adm-cell-in" placeholder="사이트명 *"/></td>
                    <td><input v-model="newCiSrcRow.url" class="adm-cell-in" placeholder="https://…"/></td>
                    <td>
                      <select v-model="newCiSrcRow.method" class="adm-cell-in">
                        <option v-for="m in CI_METHOD_OPTIONS" :key="m" :value="m">{{m}}</option>
                      </select>
                    </td>
                    <td><input v-model="newCiSrcRow.keywords" class="adm-cell-in" placeholder="리콜,품질,불량…"/></td>
                    <td><input v-model="newCiSrcRow.meaning" class="adm-cell-in" placeholder="의미/설명"/></td>
                    <td><input type="checkbox" v-model="newCiSrcRow.active"/></td>
                    <td class="adm-td-act">
                      <button class="adm-btn-icon adm-btn-save" @click.stop="submitNewCiSrcRow">✅</button>
                      <button class="adm-btn-icon adm-btn-cancel" @click.stop="cancelNewCiSrcRow">✖</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ci_keywords -->
        <div v-if="adminTab==='ci_keywords'" class="adm-section">
          <div class="adm-toolbar">
            <div class="adm-toolbar-left">
              <div class="adm-search-box">
                <input v-model="ciKwSearch" placeholder="키워드·출처명 검색…" />
              </div>
            </div>
            <button class="adm-add-btn" @click="openAddCiKwRow">키워드 추가</button>
          </div>

          <div class="adm-table-card">
            <div class="adm-table-scroll">
              <table class="adm-table">
                <thead>
                  <tr>
                    <th>키워드</th>
                    <th>경쟁사명</th>
                    <th>출처명</th>
                    <th>강도</th>
                    <th>히트수</th>
                    <th>최근 탐지</th>
                    <th>영업기회 메모</th>
                    <th>상태</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="k in filteredCiKws" :key="k._id">
                    <tr v-if="editingCiKwId !== k._id" class="adm-tr adm-tr-view">
                      <td>{{k.keyword}}</td>
                      <td>{{k.competitor_name||'—'}}</td>
                      <td>{{k.source_name||'—'}}</td>
                      <td>{{k.signal_level}}</td>
                      <td>{{k.hit_count||0}}</td>
                      <td>{{k.last_hit||'—'}}</td>
                      <td>{{k.opportunity||'—'}}</td>
                      <td>{{k.active ? '활성' : '비활성'}}</td>
                      <td class="adm-td-act">
                        <button class="adm-btn-icon adm-btn-edit" @click.stop="startEditCiKw(k)">✏️</button>
                        <button class="adm-btn-icon adm-btn-del" @click.stop="deleteCiKw(k._id, k.keyword)">🗑</button>
                      </td>
                    </tr>

                    <tr v-else class="adm-tr adm-tr-edit">
                      <td><input v-model="ciKwDraft.keyword" class="adm-cell-in" placeholder="키워드 *"/></td>
                      <td><input v-model="ciKwDraft.competitor_name" class="adm-cell-in" placeholder="경쟁사명"/></td>
                      <td><input v-model="ciKwDraft.source_name" class="adm-cell-in" placeholder="출처명"/></td>
                      <td>
                        <select v-model="ciKwDraft.signal_level" class="adm-cell-in">
                          <option v-for="lv in CI_SIG_LEVELS" :key="lv" :value="lv">{{lv}}</option>
                        </select>
                      </td>
                      <td><input type="number" v-model.number="ciKwDraft.hit_count" class="adm-cell-in adm-cell-num" style="width:60px"/></td>
                      <td><input v-model="ciKwDraft.last_hit" class="adm-cell-in" placeholder="YYYY-MM-DD"/></td>
                      <td><input v-model="ciKwDraft.opportunity" class="adm-cell-in" placeholder="영업기회 메모"/></td>
                      <td><input type="checkbox" v-model="ciKwDraft.active"/></td>
                      <td class="adm-td-act">
                        <button class="adm-btn-icon adm-btn-save" @click.stop="commitEditCiKw">✅</button>
                        <button class="adm-btn-icon adm-btn-cancel" @click.stop="cancelEditCiKw">✖</button>
                      </td>
                    </tr>
                  </template>

                  <tr v-if="addingCiKw" class="adm-tr adm-tr-edit">
                    <td><input v-model="newCiKwRow.keyword" class="adm-cell-in" placeholder="키워드 *"/></td>
                    <td><input v-model="newCiKwRow.competitor_name" class="adm-cell-in" placeholder="경쟁사명"/></td>
                    <td><input v-model="newCiKwRow.source_name" class="adm-cell-in" placeholder="출처명"/></td>
                    <td>
                      <select v-model="newCiKwRow.signal_level" class="adm-cell-in">
                        <option v-for="lv in CI_SIG_LEVELS" :key="lv" :value="lv">{{lv}}</option>
                      </select>
                    </td>
                    <td><input type="number" v-model.number="newCiKwRow.hit_count" class="adm-cell-in adm-cell-num" style="width:60px"/></td>
                    <td><input v-model="newCiKwRow.last_hit" class="adm-cell-in" placeholder="YYYY-MM-DD"/></td>
                    <td><input v-model="newCiKwRow.opportunity" class="adm-cell-in" placeholder="영업기회 메모"/></td>
                    <td><input type="checkbox" v-model="newCiKwRow.active"/></td>
                    <td class="adm-td-act">
                      <button class="adm-btn-icon adm-btn-save" @click.stop="submitNewCiKwRow">✅</button>
                      <button class="adm-btn-icon adm-btn-cancel" @click.stop="cancelNewCiKwRow">✖</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- tabstatus -->
        <div v-if="adminTab==='tabstatus'" class="adm-section">
          <div class="adm-status-legend">
            <div class="adm-legend-title">
              기업별 분석 탭 데이터 연동 상태를 설정합니다. 변경 즉시 분석 화면에 반영됩니다.
            </div>
          </div>

          <div class="adm-table-card">
            <div class="adm-table-scroll">
              <table class="adm-table adm-status-table">
                <thead>
                  <tr>
                    <th>기업</th>
                    <th v-for="tabId in TAB_IDS" :key="tabId">{{TAB_LABELS[tabId]}}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="comp in B2B_COMPANIES" :key="comp.id" class="adm-tr adm-tr-status">
                    <td>{{comp.name}}</td>
                    <td v-for="tabId in TAB_IDS" :key="tabId">
                      <div class="adm-toggle-group">
                        <button
                          v-for="(cfg,statusKey) in STATUS_CONFIG"
                          :key="statusKey"
                          class="adm-toggle-btn"
                          :class="{'adm-toggle-active': (GLOBAL_TAB_STATUSES[comp.id]?.[tabId]||'ready')===statusKey}"
                          @click="setTabStatus(comp.id, tabId, statusKey)"
                        >
                          {{cfg.label}}
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
  `,
});