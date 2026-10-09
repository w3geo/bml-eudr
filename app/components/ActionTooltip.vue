<script setup>
import { mergeProps } from 'vue';

// Tooltip for buttons that perform an action on click. Mouse users see it on hover. On touch
// devices, a tap fires emulated mouseenter and focus events, which would open a hover tooltip on
// every tap, so there it opens on long press instead, and the click that follows is swallowed.
// Right click (also what a long press on Android fires) opens it too.

const LONG_PRESS_DELAY = 500;
const TOUCH_HIDE_DELAY = 1500;

const open = ref(false);

/** @type {ReturnType<typeof setTimeout>|undefined} */
let pressTimeout;
/** @type {ReturnType<typeof setTimeout>|undefined} */
let hideTimeout;
let suppressClick = false;

function show() {
  clearTimeout(hideTimeout);
  open.value = true;
}

function hide() {
  clearTimeout(hideTimeout);
  open.value = false;
}

function hideLater() {
  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(hide, TOUCH_HIDE_DELAY);
}

function cancelPress() {
  clearTimeout(pressTimeout);
}

const handlers = {
  /** @param {PointerEvent} event */
  onPointerenter(event) {
    if (event.pointerType === 'mouse') {
      show();
    }
  },
  /** @param {PointerEvent} event */
  onPointerleave(event) {
    if (event.pointerType === 'mouse') {
      hide();
    }
  },
  /** @param {PointerEvent} event */
  onPointerdown(event) {
    suppressClick = false;
    if (event.pointerType === 'mouse') {
      return;
    }
    cancelPress();
    pressTimeout = setTimeout(() => {
      suppressClick = true;
      show();
    }, LONG_PRESS_DELAY);
  },
  /** @param {PointerEvent} event */
  onPointerup(event) {
    cancelPress();
    if (event.pointerType !== 'mouse' && open.value) {
      hideLater();
    }
  },
  onPointercancel() {
    cancelPress();
    if (open.value) {
      hideLater();
    }
  },
  /**
   * A PointerEvent per spec, but older Firefox and Safari versions fire a plain MouseEvent.
   * @param {MouseEvent} event
   */
  onContextmenu(event) {
    event.preventDefault();
    cancelPress();
    show();
    if (!(event instanceof PointerEvent) || event.pointerType !== 'mouse') {
      suppressClick = true;
      hideLater();
    }
  },
  /** @param {MouseEvent} event */
  onClickCapture(event) {
    if (suppressClick) {
      suppressClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },
  /** @param {FocusEvent} event */
  onFocus(event) {
    if (/** @type {Element} */ (event.target).matches(':focus-visible')) {
      show();
    }
  },
  onBlur: hide,
  style: { '-webkit-touch-callout': 'none' },
};

onBeforeUnmount(() => {
  cancelPress();
  clearTimeout(hideTimeout);
});
</script>

<template>
  <v-tooltip v-model="open" :open-on-hover="false" :open-on-focus="false" :open-on-click="false">
    <template #activator="{ props }">
      <slot name="activator" :props="mergeProps(props, handlers)" />
    </template>
    <slot />
  </v-tooltip>
</template>
