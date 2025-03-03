<script setup>
import { ref } from 'vue';

const { mdAndUp, xs } = useDisplay();
const { area } = useStatement();

const form = ref({
  area: 0,
  quantity: 0,
});

watch(area, (value) => {
  form.value.area = value;
  form.value.quantity = toPrecision(value * 4, 4);
});
</script>

<template>
  <v-container fluid>
    <v-form>
      <v-row>
        <v-col :cols="mdAndUp ? 2 : xs ? 6 : 3">
          <v-text-field
            v-model.number="form.area"
            readonly
            disabled
            density="compact"
            hide-details
            variant="outlined"
            type="number"
            label="Fläche"
            suffix="ha"
          ></v-text-field>
        </v-col>
        <v-col :cols="mdAndUp ? 2 : xs ? 6 : 3">
          <v-text-field
            v-model.number="form.quantity"
            density="compact"
            variant="outlined"
            hide-details
            type="number"
            label="Menge"
            suffix="t"
          ></v-text-field>
        </v-col>
      </v-row>
    </v-form>
  </v-container>
</template>

<style scoped></style>
