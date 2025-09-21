<script setup>
definePageMeta({
  title: 'Erzeugungsort erfassen',
  sort: 40,
});

/** @type {Array<{ title: string; value: import('~~/shared/utils/constants').Commodity }>} */
const commodities = COMMODITY_KEYS.reduce((acc, value) => {
  const title = COMMODITIES[value].title;
  acc.push({ title, value });
  return acc;
}, /** @type {Array<{ title: string; value: import('~~/shared/utils/constants').Commodity }>} */ ([]));

/** @type {Ref<import('~~/shared/utils/constants').Commodity|undefined>} */
const commodity = ref(commodities[0]?.value);
</script>

<template>
  <v-container class="fill-height mt-1">
    <v-layout class="fill-height">
      <v-app-bar density="compact">
        <v-app-bar-title>Erzeugungsort erfassen </v-app-bar-title>
        <template #extension>
          <v-toolbar density="compact" color="transparent">
            <v-radio-group
              v-model="commodity"
              inline
              hide-details="auto"
              density="compact"
              class="ml-2"
            >
              <v-radio
                v-for="item in commodities"
                :key="item.value"
                class="ml-2"
                :label="item.title"
                :value="item.value"
              />
            </v-radio-group>
          </v-toolbar>
        </template>
      </v-app-bar>
      <v-main>
        <places-map :commodity="commodity" class="fill-height" />
      </v-main>
    </v-layout>
  </v-container>
</template>
