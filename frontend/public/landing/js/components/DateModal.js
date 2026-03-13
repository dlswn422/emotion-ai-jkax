const { defineComponent, ref } = Vue;

export const DateModal = defineComponent({
  name: 'DateModal',
  props: { modelValue: Boolean },
  emits: ['update:modelValue', 'confirm'],
  setup(props, { emit }) {
    const preset = ref('3m');
    const startDate = ref('2025-12-09');
    const endDate = ref('2026-03-09');

    function applyPreset(p) {
      preset.value = p;
      const end = new Date();
      let start = new Date();
      const fmt = d => d.toISOString().slice(0, 10);

      if (p === '7d') start.setDate(end.getDate() - 7);
      else if (p === '30d') start.setDate(end.getDate() - 30);
      else if (p === '3m') start.setMonth(end.getMonth() - 3);
      else if (p === '6m') start.setMonth(end.getMonth() - 6);
      else start = new Date('2020-01-01');

      startDate.value = fmt(start);
      endDate.value = fmt(end);
    }

    function confirm() {
      emit('confirm', { start: startDate.value, end: endDate.value });
      emit('update:modelValue', false);
    }

    return { preset, startDate, endDate, applyPreset, confirm };
  },
  template: `
  <teleport to="body">
    <transition name="fade">
      <div v-if="modelValue" class="modal-backdrop" @click.self="$emit('update:modelValue',false)">
        <div class="modal-box">
          <div class="modal-hd">
            <h3>
              <div class="modal-hd-icon">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
              </div>
              분석 기간 선택
            </h3>
            <button class="modal-close" @click="$emit('update:modelValue',false)">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="preset-row">
            <button v-for="p in [{k:'7d',l:'최근 7일'},{k:'30d',l:'최근 30일'},{k:'3m',l:'최근 3개월'},{k:'6m',l:'최근 6개월'}]"
              :key="p.k" :class="['preset-btn',{active:preset===p.k}]" @click="applyPreset(p.k)">{{p.l}}</button>
            <button :class="['preset-btn wide',{active:preset==='all'}]" @click="applyPreset('all')">전체 기간</button>
          </div>
          <div class="date-row">
            <div class="date-field">
              <label>시작일</label>
              <div class="date-input">
                <input type="date" v-model="startDate"/>
                <svg class="di" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
              </div>
            </div>
            <div class="date-field">
              <label>종료일</label>
              <div class="date-input">
                <input type="date" v-model="endDate"/>
                <svg class="di" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
              </div>
            </div>
          </div>
          <div class="modal-ft">
            <button class="btn btn-ghost btn-sm" @click="$emit('update:modelValue',false)">취소</button>
            <button class="btn btn-brand btn-sm" @click="confirm">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
              </svg>
              분석 시작
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>`
});