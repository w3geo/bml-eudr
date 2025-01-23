<script setup>
definePageMeta({
  middleware: ['authenticated-only'],
  title: 'Sorgfaltspflichterklärung',
});
useSeoMeta({
  title: 'Sorgfaltspflichterklärung',
  description:
    'Erstellen Sie Ihre Sorgfaltspflichterklärung im Rahmen der EU-Entwaldungsverordnung (EUDR) schnell und einfach.',
});
</script>

<template>
  <div>
    <h1>Statement</h1>
    <p>Statement page content</p>
  </div>
</template>
