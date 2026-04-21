const { defineComponent, ref } = Vue;

export const DateModal = defineComponent({
  name: "DateModal",
  props: { modelValue: Boolean },
  emits: ["update:modelValue", "confirm"],
  setup(props, { emit }) {
    const preset = ref("90d");
    const startDate = ref("");
    const endDate = ref("");

    function formatDateLocal(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    function buildRange(p) {
      const end = new Date();
      const start = new Date(end);

      switch (p) {
        case "7d":
          start.setDate(end.getDate() - 6);
          return {
            start: formatDateLocal(start),
            end: formatDateLocal(end),
          };

        case "30d":
          start.setDate(end.getDate() - 29);
          return {
            start: formatDateLocal(start),
            end: formatDateLocal(end),
          };

        case "90d":
          start.setDate(end.getDate() - 89);
          return {
            start: formatDateLocal(start),
            end: formatDateLocal(end),
          };

        case "365d":
          start.setDate(end.getDate() - 364);
          return {
            start: formatDateLocal(start),
            end: formatDateLocal(end),
          };

        case "all":
          // 임시 정책: 전체 기간 = 365D로 취급
          start.setDate(end.getDate() - 364);
          return {
            start: formatDateLocal(start),
            end: formatDateLocal(end),
          };

        default:
          start.setDate(end.getDate() - 89);
          return {
            start: formatDateLocal(start),
            end: formatDateLocal(end),
          };
      }
    }

    function applyPreset(p) {
      preset.value = p;
      const range = buildRange(p);
      startDate.value = range.start;
      endDate.value = range.end;
    }

    function confirm() {
      emit("confirm", {
        start: startDate.value,
        end: endDate.value,
      });
      emit("update:modelValue", false);
    }

    applyPreset("90d");

    return {
      preset,
      startDate,
      endDate,
      applyPreset,
      confirm,
    };
  },
  template: `
  <teleport to="body">
    <transition name="fade">
      <div
        v-if="modelValue"
        class="modal-backdrop"
        @click.self="$emit('update:modelValue', false)"
      >
        <div class="modal-box">
          <div class="modal-hd">
            <h3>
              <div class="modal-hd-icon">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
              </div>
              분석 기간 선택
            </h3>
            <button class="modal-close" @click="$emit('update:modelValue', false)">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="preset-row">
            <button
              v-for="p in [
                { k: '7d', l: '최근 7일' },
                { k: '30d', l: '최근 30일' },
                { k: '90d', l: '최근 90일' },
                { k: '365d', l: '최근 1년' }
              ]"
              :key="p.k"
              :class="['preset-btn', { active: preset === p.k }]"
              @click="applyPreset(p.k)"
            >
              {{ p.l }}
            </button>

            <button
              :class="['preset-btn', 'wide', { active: preset === 'all' }]"
              @click="applyPreset('all')"
            >
              전체 기간
            </button>
          </div>

          <div class="date-row">
            <div class="date-field">
              <label>시작일</label>
              <div class="date-input">
                <input type="date" v-model="startDate" />
                <svg class="di" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
              </div>
            </div>

            <div class="date-field">
              <label>종료일</label>
              <div class="date-input">
                <input type="date" v-model="endDate" />
                <svg class="di" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="modal-ft">
            <button class="btn btn-ghost btn-sm" @click="$emit('update:modelValue', false)">
              취소
            </button>
            <button class="btn btn-brand btn-sm" @click="confirm">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              분석 시작
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>`,
});