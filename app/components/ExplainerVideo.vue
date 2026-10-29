<script setup>
import { mdiPlay } from '@mdi/js';

const props = defineProps({
  /** Base name of the video and its poster in videos/, see server/routes/videos/[file].js */
  name: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  /** Duration in seconds */
  duration: {
    type: Number,
    required: true,
  },
});

const durationText = computed(
  () => `${Math.floor(props.duration / 60)}:${String(props.duration % 60).padStart(2, '0')}`,
);

/** @type {import('vue').Ref<HTMLVideoElement|null>} */
const video = ref(null);
// Native controls would cover the poster, so they are only shown once the video was started
const started = ref(false);

function play() {
  started.value = true;
  video.value?.play();
}
</script>

<template>
  <v-card class="d-flex flex-column h-100">
    <div class="position-relative">
      <video
        ref="video"
        class="explainer-video"
        :src="`/videos/${props.name}.mp4`"
        :poster="`/videos/${props.name}.jpg`"
        :controls="started"
        playsinline
        preload="none"
        @play="started = true"
      />
      <button
        v-if="!started"
        type="button"
        class="explainer-video-start"
        :aria-label="`Video abspielen: ${props.title}`"
        @click="play"
      >
        <v-icon :icon="mdiPlay" size="48" color="white" class="explainer-video-play" />
        <span class="explainer-video-duration text-caption">{{ durationText }}</span>
      </button>
    </div>
    <v-card-title class="text-wrap">{{ props.title }}</v-card-title>
    <v-card-text>{{ props.text }}</v-card-text>
  </v-card>
</template>

<style scoped>
.explainer-video {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: black;
}
.explainer-video-start {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.explainer-video-play {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  transition: transform 0.15s;
}
.explainer-video-start:hover .explainer-video-play,
.explainer-video-start:focus-visible .explainer-video-play {
  transform: scale(1.1);
}
.explainer-video-start:focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: -3px;
}
.explainer-video-duration {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 0 6px;
  border-radius: 4px;
  color: white;
  background: rgba(0, 0, 0, 0.7);
}
</style>
