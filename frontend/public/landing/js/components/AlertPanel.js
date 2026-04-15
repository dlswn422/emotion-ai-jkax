const { defineComponent, ref } = Vue;
import { ALERT_STORE, ALERT_SEVERITY } from "../b2b/shared.js";
export const AlertPanel = defineComponent({
  name: "AlertPanel",
  setup() {
    /* 수신자 목록 (Admin에서 확장 가능) */
    const RECIPIENTS = [
      {
        id: "ceo",
        name: "대표이사 (CEO)",
        email: "ceo@company.com",
        checked: ref(true),
      },
      {
        id: "coo",
        name: "최고운영책임자 (COO)",
        email: "coo@company.com",
        checked: ref(false),
      },
      {
        id: "cmo",
        name: "마케팅총괄 (CMO)",
        email: "cmo@company.com",
        checked: ref(false),
      },
      {
        id: "cso",
        name: "전략기획실장 (CSO)",
        email: "strategy@company.com",
        checked: ref(false),
      },
      {
        id: "cs",
        name: "CS팀장",
        email: "cs@company.com",
        checked: ref(false),
      },
    ];

    const store = ALERT_STORE;
    const sendStep = ref(1); // 1: 수신자 선택 2: 메시지 편집 3: 발송 완료
    const editMsg = ref("");
    const sending = ref(false);

    // ── Socket.io 실시간 알림 연결 (싱글톤) ──
    const BACKEND_URL = "https://emotion-ai-backend-bfdc.onrender.com";

    if (typeof io !== "undefined" && !window._cxSocketInitialized) {
      window._cxSocketInitialized = true;

      const socket = io(BACKEND_URL, { transports: ["websocket"] });
      window._cxSocket = socket;

      socket.on("connect", () => {
        console.log("[Socket.io] AlertPanel 연결 완료:", socket.id);
        socket.emit("join_room", { tenant_id: 7 });
      });

      socket.on("new_alert", (data) => {
        console.log("[Socket.io] 새 알림 수신:", data);

        const severityMap = {
          "긴급": "critical",
          "주의": "warning",
          "일반": "info",
          "정보": "info",
        };
        const severity = severityMap[data.category] || "info";

        store.add({
          severity,
          dbId: data.db_id || null,
          title: data.message || "새 알림이 감지되었습니다.",
          companyName: data.company_name || "",
          tabLabel: data.signal_type_label || "",
          keyword: data.keyword || "",
          desc: data.message || "",
          dupKey: `socket-${Date.now()}`,
        });

        // open_panel = true 인 경우에만 패널 자동 오픈 (요약 메시지)
        if (data.open_panel) {
          store.showPanel = true;
        }
      });

      socket.on("disconnect", () => {
        console.log("[Socket.io] AlertPanel 연결 해제");
        window._cxSocketInitialized = false;
      });
    } else if (!window._cxSocketInitialized) {
      console.warn("[Socket.io] io 라이브러리를 찾을 수 없습니다.");
    }

    function openSend(alert) {
      store.pendingAlert = alert;
      editMsg.value = buildDefaultMsg(alert);
      sendStep.value = 1;
      RECIPIENTS.forEach((r) => {
        r.checked.value = r.id === "ceo";
      });
      store.showSendModal = true;
    }

    function buildDefaultMsg(a) {
      const now = new Date().toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
      });

      return `[CXNexus 경영진 Alert — ${
        a.severity === "critical"
          ? "🔴 긴급"
          : a.severity === "warning"
            ? "🟡 주의"
            : "🔵 정보"
      }]

안녕하세요. CXNexus 자동 알림 시스템입니다.

▶ 감지 항목: ${a.title}
▶ 대상 기업: ${a.companyName}
▶ 분석 탭: ${a.tabLabel}
▶ 감지 키워드: "${a.keyword}"
▶ 감지 시각: ${now}

${a.desc}

빠른 검토와 적절한 대응 조치를 요청드립니다.

— CXNexus 자동 알림 시스템`;
    }

    async function sendAlert() {
      sending.value = true;
      await new Promise((r) => setTimeout(r, 1200)); // 전송 시뮬레이션

      const recipients = RECIPIENTS.filter((r) => r.checked.value).map(
        (r) => r.name,
      );

      if (store.pendingAlert) {
        store.markSent(store.pendingAlert.id, recipients);
      }

      sending.value = false;
      sendStep.value = 3;
    }

    function closeSend() {
      store.showSendModal = false;
      store.pendingAlert = null;
      sendStep.value = 1;
    }

    // 단건 읽음 처리
    async function markRead(alert) {
      store.markRead(alert.id);
      if (alert.dbId) {
        try {
          await fetch(`${BACKEND_URL}/notifications/${alert.dbId}/read`, {
            method: "PATCH",
          });
        } catch (e) {
          console.warn("[Notification] 읽음 처리 실패:", e);
        }
      }
    }

    // 전체 읽음 처리
    async function markAllRead() {
      store.markAllRead();
      try {
        await fetch(`${BACKEND_URL}/notifications/read-all`, {
          method: "PATCH",
        });
      } catch (e) {
        console.warn("[Notification] 전체 읽음 처리 실패:", e);
      }
    }

    const sevCfg = (id) => ALERT_SEVERITY[id] || ALERT_SEVERITY.info;

    function fmtDate(iso) {
      if (!iso) return "";
      const d = new Date(iso);
      return d.toLocaleString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return {
      store,
      RECIPIENTS,
      sendStep,
      editMsg,
      sending,
      openSend,
      sendAlert,
      closeSend,
      sevCfg,
      fmtDate,
      ALERT_SEVERITY,
      markRead,
      markAllRead,
    };
  },

  template: `
  <teleport to="body">

    <transition name="alert-slide">
      <div v-if="store.showPanel" class="alp-backdrop" @click.self="store.showPanel=false">
        <div class="alp-panel">
          <div class="alp-hd">
            <div class="alp-hd-left">
              <div class="alp-hd-icon">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
              </div>
              <span class="alp-hd-title">경영진 Alert</span>
              <span v-if="store.unread > 0" class="alp-unread-badge">{{store.unread}}</span>
            </div>

            <div class="alp-hd-right">
              <button v-if="store.alerts.length" class="alp-read-all" @click="markAllRead()">전체 읽음</button>
              <button class="alp-close-btn" @click="store.showPanel=false">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <div v-if="!store.alerts.length" class="alp-empty">
            <div class="alp-empty-icon">
              <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            </div>
            <p>감지된 부정 키워드 알림이 없습니다</p>
          </div>

          <div class="alp-list">
            <div
              v-for="alert in store.alerts"
              :key="alert.id"
              :class="['alp-item', 'alp-sev-'+alert.severity, { unread: !alert.read }]"
              @click="markRead(alert)"
            >
              <div
                class="alp-item-icon"
                :style="{ background: sevCfg(alert.severity).bg, border: '1.5px solid '+sevCfg(alert.severity).border }"
              >
                <svg width="14" height="14" fill="none" :stroke="sevCfg(alert.severity).color" stroke-width="2" viewBox="0 0 24 24">
                  <path :d="sevCfg(alert.severity).icon"/>
                </svg>
              </div>

              <div class="alp-item-body">
                <div class="alp-item-top">
                  <span
                    class="alp-sev-tag"
                    :style="{ color: sevCfg(alert.severity).color, background: sevCfg(alert.severity).bg, borderColor: sevCfg(alert.severity).border }"
                  >
                    {{sevCfg(alert.severity).label}}
                  </span>

                  <span class="alp-item-tab">{{alert.tabLabel}}</span>
                  <span class="alp-item-time">{{fmtDate(alert.createdAt)}}</span>
                  <span v-if="!alert.read" class="alp-dot-unread"></span>
                </div>

                <div class="alp-item-title">{{alert.title}}</div>

                <div class="alp-item-company">
                  <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"/>
                  </svg>
                  {{alert.companyName}}
                </div>

                <div v-if="alert.sentAt" class="alp-sent-info">
                  <svg width="10" height="10" fill="none" stroke="#10b981" stroke-width="2.5" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                  발송 완료 · {{alert.sentTo.join(', ')}}
                </div>
              </div>

              <div class="alp-item-actions">


                <button class="alp-del-btn" @click.stop="store.remove(alert.id)" title="삭제">
                  <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="store.showSendModal" class="modal-backdrop" @click.self="closeSend">
        <div class="alp-send-modal">

          <template v-if="sendStep===1">
            <div class="modal-hd">
              <h3>
                <div class="modal-hd-icon" style="background:linear-gradient(135deg,#f43f5e,#f59e0b)">
                  <svg width="14" height="14" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                  </svg>
                </div>
                경영진 Alert 발송
              </h3>

              <button class="modal-close" @click="closeSend">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div
              v-if="store.pendingAlert"
              class="alp-modal-summary"
              :style="{ background: sevCfg(store.pendingAlert.severity).bg, borderColor: sevCfg(store.pendingAlert.severity).border }"
            >
              <span
                class="alp-sev-tag"
                :style="{ color: sevCfg(store.pendingAlert.severity).color, background: '#fff', borderColor: sevCfg(store.pendingAlert.severity).border }"
              >
                {{sevCfg(store.pendingAlert.severity).label}}
              </span>

              <div class="alp-modal-kw" :style="{ color: sevCfg(store.pendingAlert.severity).color }">
                "{{store.pendingAlert.keyword}}"
              </div>

              <div class="alp-modal-meta">
                {{store.pendingAlert.companyName}} · {{store.pendingAlert.tabLabel}}
              </div>
            </div>

            <div class="alp-recip-label">수신자 선택</div>

            <div class="alp-recip-list">
              <label v-for="r in RECIPIENTS" :key="r.id" class="alp-recip-item">
                <input type="checkbox" v-model="r.checked.value" class="alp-recip-chk"/>
                <div class="alp-recip-info">
                  <span class="alp-recip-name">{{r.name}}</span>
                  <span class="alp-recip-email">{{r.email}}</span>
                </div>
              </label>
            </div>

            <div class="modal-actions">
              <button class="btn btn-ghost btn-sm" @click="closeSend">취소</button>
              <button class="btn btn-brand btn-sm" @click="sendStep=2">
                다음 — 메시지 확인
                <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>
          </template>

          <template v-else-if="sendStep===2">
            <div class="modal-hd">
              <h3>
                <div class="modal-hd-icon" style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">
                  <svg width="14" height="14" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </div>
                메시지 편집
              </h3>

              <button class="modal-close" @click="closeSend">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="alp-msg-wrap">
              <textarea class="alp-msg-textarea" v-model="editMsg" rows="12"></textarea>
            </div>

            <div class="alp-recip-preview">
              발송 대상:
              <span
                v-for="r in RECIPIENTS.filter(r=>r.checked.value)"
                :key="r.id"
                class="alp-recip-chip"
              >
                {{r.name}}
              </span>
            </div>

            <div class="modal-actions">
              <button class="btn btn-ghost btn-sm" @click="sendStep=1">← 뒤로</button>
              <button class="btn btn-brand btn-sm" @click="sendAlert" :disabled="sending">
                <span v-if="sending" class="alp-spinner"></span>
                <svg v-else width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
                {{sending ? '발송 중...' : 'Alert 발송'}}
              </button>
            </div>
          </template>

          <template v-else>
            <div class="alp-success">
              <div class="alp-success-icon">
                <svg width="32" height="32" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </div>

              <h3 class="alp-success-title">Alert 발송 완료</h3>
              <p class="alp-success-desc">경영진에게 Alert가 성공적으로 발송되었습니다.</p>

              <div class="alp-success-recipients">
                <span
                  v-for="r in RECIPIENTS.filter(r=>r.checked.value)"
                  :key="r.id"
                  class="alp-recip-chip sent"
                >
                  <svg width="9" height="9" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                  {{r.name}}
                </span>
              </div>

              <button class="btn btn-brand btn-sm" style="margin-top:20px" @click="closeSend">
                확인
              </button>
            </div>
          </template>

        </div>
      </div>
    </transition>

  </teleport>
  `,
});