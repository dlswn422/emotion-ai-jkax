const { defineComponent, ref, computed } = Vue;

export const DateModal = defineComponent({
  name: "DateModal",
  props: { modelValue: Boolean },
  emits: ["update:modelValue", "confirm"],
  setup(props, { emit }) {
    const preset = ref("weekly");

    const presetOptions = [
      {
        k: "daily",
        l: "일간 분석",
        desc: "최근 1일 집계",
        updatedAt: "최종 갱신: 오늘 오전 3시",
      },
      {
        k: "weekly",
        l: "주간 분석",
        desc: "최근 7일 집계",
        updatedAt: "최종 갱신: 오늘 오전 3시",
      },
      {
        k: "monthly",
        l: "월간 분석",
        desc: "최근 30일 집계",
        updatedAt: "최종 갱신: 오늘 오전 3시",
      },
      {
        k: "quarterly",
        l: "분기 분석",
        desc: "최근 3개월 집계",
        updatedAt: "최종 갱신: 오늘 오전 3시",
      },
      {
        k: "yearly",
        l: "연간 분석",
        desc: "최근 1년 집계",
        updatedAt: "최종 갱신: 오늘 오전 3시",
      },
      {
        k: "all",
        l: "전체 누적",
        desc: "전체 기간 집계",
        updatedAt: "최종 갱신: 오늘 오전 3시",
      },
    ];

    function applyPreset(p) {
      preset.value = p;
    }

    const selectedPreset = computed(() => {
      return (
        presetOptions.find((item) => item.k === preset.value) ||
        presetOptions[0]
      );
    });

    function closeModal() {
      emit("update:modelValue", false);
    }

    function confirm() {
      emit("confirm", {
        snapshotKey: selectedPreset.value.k,
        snapshotLabel: selectedPreset.value.l,
      });
      closeModal();
    }

    return {
      preset,
      presetOptions,
      selectedPreset,
      applyPreset,
      confirm,
      closeModal,
    };
  },
  template: `
  <teleport to="body">
    <transition name="fade">
      <div v-if="modelValue" class="modal-backdrop" @click.self="closeModal">
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
            <button class="modal-close" @click="closeModal">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="preset-subtext">
            미리 생성된 기간별 분석 결과를 빠르게 불러옵니다.
          </div>

          <div class="preset-row period-preset-row">
            <button
              v-for="p in presetOptions"
              :key="p.k"
              :class="['preset-btn', { active: preset === p.k }]"
              @click="applyPreset(p.k)"
            >
              {{ p.l }}
            </button>
          </div>

          <div class="period-inline-status">
            {{ selectedPreset.l }} · {{ selectedPreset.desc }} · {{ selectedPreset.updatedAt }}
          </div>

          <div class="modal-ft">
            <button class="btn btn-ghost btn-sm" @click="closeModal">취소</button>
            <button class="btn btn-brand btn-sm" @click="confirm">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
              </svg>
              결과 보기
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>`,
});
