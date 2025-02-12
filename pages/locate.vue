<script setup>
definePageMeta({
  title: 'Erzeugungsort erfassen',
  sort: 40,
});
</script>

<template>
  <v-container class="d-flex fill-height">
    <v-row class="fill-height">
      <v-col class="fill-height">
        <v-card class="fill-height">
          <v-layout class="fill-height">
            <v-app-bar flat density="compact" title="Erzeugungsort erfassen"></v-app-bar>
            <v-main>
              <agraratlas-map class="fill-height" />
            </v-main>
          </v-layout>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
