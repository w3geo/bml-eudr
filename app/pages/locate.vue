<script setup>
definePageMeta({
  title: 'Erzeugungsort erfassen',
  sort: 40,
});

/** @type {Array<{ title: string; value: import('~/utils/constants').Commodity }>} */
const commodities = COMMODITY_KEYS.reduce((acc, value) => {
  const title = COMMODITIES[value].title;
  acc.push({ title, value });
  return acc;
}, /** @type {Array<{ title: string; value: import('~/utils/constants').Commodity }>} */ ([]));

/** @type {Ref<import('~/utils/constants').Commodity|undefined>} */
const commodity = ref(commodities[0]?.value);
</script>

<template>
  <v-container class="pt-1 fill-height">
    <v-row class="fill-height">
      <v-col cols="12">
        <v-card class="fill-height">
          <v-card-title
            >Erzeugungsort erfassen
            <v-radio-group
              v-model="commodity"
              hide-details="auto"
              density="compact"
              class="mt-2"
              inline
            >
              <v-radio
                v-for="item in commodities"
                :key="item.value"
                class="mr-2"
                :label="item.title"
                :value="item.value"
              />
            </v-radio-group>
          </v-card-title>
          <v-card-text class="fill-height">
            <places-map :commodity="commodity" class="fill-height" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
