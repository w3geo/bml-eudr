<script setup>
import { mdiArrowLeft, mdiPrinter } from '@mdi/js';

definePageMeta({
  middleware: ['authenticated-only'],
});
useSeoMeta({
  title: 'Vereinfachte Erklärung drucken',
});

const route = useRoute();
const { data: statement, error } = await useFetch(`/api/statements/${route.params.sdId}`);
const { data: user } = await useFetch('/api/users/me');

/** Descriptions of the Combined Nomenclature chapters and headings we submit. */
const HS_DESCRIPTIONS = /** @type {Record<string, string>} */ ({
  '01': 'Lebende Tiere',
  '0102': 'Rinder, lebend',
  '12': 'Ölsamen und ölhaltige Früchte; verschiedene Samen und Früchte; Pflanzen zum Gewerbe- oder Heilgebrauch; Stroh und Futter',
  '1201': 'Sojabohnen, auch geschrotet',
  '120190': 'andere (nicht zur Aussaat)',
  '44': 'Holz und Holzwaren; Holzkohle',
  '4401':
    'Brennholz; Holz in Form von Plättchen oder Schnitzeln; Sägespäne, Holzabfälle und Holzausschuss',
  '4403': 'Rohholz, auch entrindet, vom Splint befreit oder zwei- oder vierseitig grob zugerichtet',
});

/** @type {Record<string, string>} */
const IDENTIFIER_TYPES = {
  GLN: 'GLN',
  TIN: 'Steuernummer',
  VAT: 'UID',
};

// TRACES redacts the operator address and identifier when retrieving a statement, so the
// operator section is filled from the user data, which is what the statement was submitted with.
const operator = computed(() => ({
  name: user.value?.name ?? '',
  address: user.value?.address ?? '',
  identifierType: user.value?.identifierType ?? '',
  identifierValue: user.value?.identifierValue ?? '',
}));

const geolocationVisible = computed(
  () =>
    !statement.value ||
    !('geolocationVisible' in statement.value) ||
    statement.value.geolocationVisible !== false,
);

/**
 * One row per HS code with a quantity, with the chapter/heading hierarchy as in TRACES.
 */
const rows = computed(() =>
  (statement.value?.commodities ?? []).flatMap((commodity) => {
    const metadata = COMMODITIES[commodity.key];
    const quantity = unref(commodity.quantity);
    const geojson = unref(commodity.geojson);
    const address = unref(commodity.address);
    const places = geojson?.features?.filter((f) => f.geometry).length || 0;
    const location = places
      ? `Geolokalisation, ${places} ${places === 1 ? 'Fläche' : 'Flächen'}`
      : address?.postalCode
        ? `${address.street}, ${address.postalCode} ${address.city}`
        : '–';
    return (metadata?.hsHeadings ?? [])
      .filter((hsCode) => quantity[hsCode])
      .map((hsCode) => ({
        hsCode,
        hierarchy: [hsCode.slice(0, 2), hsCode.slice(0, 4), hsCode]
          .filter((code, i, codes) => codes.indexOf(code) === i)
          .map((code) => ({ code, description: HS_DESCRIPTIONS[code] ?? '' })),
        description: HS_HEADING[hsCode] ?? hsCode,
        quantity: `${quantity[hsCode]?.toLocaleString('de-AT')} ${metadata.units}`,
        location,
      }));
  }),
);

/** @param {string|undefined} date */
const formatDate = (date) =>
  date ? new Date(date).toLocaleString('de-AT', { timeZone: 'Europe/Vienna' }) : '';

const print = () => window.print();

// Set on the client only, so server and client render don't disagree on the time.
const createdOn = ref('');
onMounted(() => {
  createdOn.value = formatDate(new Date().toISOString());
});
</script>

<template>
  <v-theme-provider theme="light" with-background>
    <v-container class="print-sheet">
      <div class="d-flex ga-2 mb-4 d-print-none">
        <v-btn :prepend-icon="mdiArrowLeft" variant="text" to="/account">Zurück</v-btn>
        <v-spacer />
        <v-btn
          :prepend-icon="mdiPrinter"
          color="primary"
          :disabled="!statement?.referenceNumber"
          @click="print"
        >
          Drucken / als PDF speichern
        </v-btn>
      </div>

      <v-alert v-if="error" type="warning" class="d-print-none">
        Die Vereinfachte Erklärung konnte nicht abgerufen werden. Bitte versuchen Sie es später
        erneut.
      </v-alert>

      <template v-else-if="statement">
        <header class="d-flex align-end justify-space-between flex-wrap ga-2 mb-2">
          <h1 class="text-h6">Vereinfachte Erklärung</h1>
          <span class="text-body-2"
            >Status: {{ STATUS_LABELS[statement.status] ?? statement.status }}</span
          >
        </header>

        <table class="sheet">
          <tbody>
            <tr>
              <th class="half">Identifikationsnummer</th>
              <th>Tätigkeit</th>
            </tr>
            <tr>
              <td class="font-weight-bold">
                {{ statement.referenceNumber ?? 'Wird erstellt...' }}
              </td>
              <td>Inländisch – Österreich (AT)</td>
            </tr>
            <tr>
              <th>Verifikationsnummer</th>
              <th>Datum</th>
            </tr>
            <tr>
              <td class="font-weight-bold">{{ statement.verificationNumber }}</td>
              <td>{{ formatDate(statement.date) }}</td>
            </tr>
          </tbody>
        </table>

        <table class="sheet mt-4">
          <tbody>
            <tr>
              <th colspan="2">Name und Anschrift des Marktteilnehmers</th>
            </tr>
            <tr>
              <td class="label">Name</td>
              <td class="font-weight-bold">{{ operator.name }}</td>
            </tr>
            <tr>
              <td class="label">Anschrift</td>
              <td>{{ operator.address }}, Österreich</td>
            </tr>
            <tr>
              <td class="label">
                {{ IDENTIFIER_TYPES[operator.identifierType] ?? operator.identifierType }}
              </td>
              <td>{{ operator.identifierValue }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Not kept together as a whole: the rows may span pages, the header repeats. -->
        <table class="sheet commodities mt-4">
          <thead>
            <tr>
              <th class="commodity">Rohstoff/Erzeugnis</th>
              <th>Menge</th>
              <th>Erzeugungsland</th>
              <th>Erzeugungsort</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.hsCode">
              <td>
                <div class="font-weight-bold">{{ row.description }}</div>
                <div
                  v-for="(level, i) in row.hierarchy"
                  :key="level.code"
                  class="text-caption"
                  :style="{ paddingLeft: `${i * 1.5}em` }"
                >
                  <span class="font-weight-bold mr-2">{{ level.code }}</span>
                  {{ level.description }}
                </div>
              </td>
              <td class="text-no-wrap">{{ row.quantity }}</td>
              <td>Österreich (AT)</td>
              <td>
                {{ row.location }}
                <span v-if="!geolocationVisible && row.location.startsWith('Geo')">
                  (vertraulich)
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <p class="text-caption mt-6">
          Die Angaben zur Erklärung und zu den Rohstoffen/Erzeugnissen stammen aus dem
          EU-Informationssystem (TRACES), Name und Anschrift des Marktteilnehmers aus den aktuellen
          Angaben zum Betrieb in der Anwendung „EUDR Meldung“. Maßgeblich ist die in TRACES
          gespeicherte Erklärung, die mit Identifikations- und Verifikationsnummer abgerufen werden
          kann.
          <template v-if="createdOn">Erstellt am {{ createdOn }}.</template>
        </p>
      </template>
    </v-container>
  </v-theme-provider>
</template>

<style scoped>
.print-sheet {
  max-width: 21cm;
}
.sheet {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  break-inside: avoid;
}
.sheet th,
.sheet td {
  border: 1px solid rgba(0, 0, 0, 0.6);
  padding: 4px 8px;
  text-align: left;
  vertical-align: top;
}
.sheet th {
  font-weight: normal;
  background: rgba(0, 0, 0, 0.06);
}
.sheet .label {
  width: 8em;
}
.sheet .half {
  width: 50%;
}
.sheet.commodities {
  break-inside: auto;
}
.sheet.commodities tr {
  break-inside: avoid;
}
.sheet .commodity {
  width: 50%;
}
@media print {
  .print-sheet {
    max-width: none;
    padding: 0 2mm;
  }
  .sheet th {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
