<script setup>
import {
  mdiAccountEdit,
  mdiCheck,
  mdiCheckDecagram,
  mdiClose,
  mdiEmailFastOutline,
  mdiHelpCircleOutline,
  mdiMessageTextOutline,
} from '@mdi/js';
import { FetchError } from 'ofetch';
import useOnBehalfOf from '~/composables/useOnBehalfOf';

definePageMeta({
  middleware: ['authenticated-only'],
  title: 'Sorgfaltserklärung',
  sort: 20,
});

const { query } = useRoute();
const { mdAndUp, xs } = useDisplay();
const { start, finish, clear } = useLoadingIndicator();
const { errorMessage } = useErrorMessage();
/** @type {import('vue').Ref<import('~/components/UserData.vue').default|null>} */
const userDataComplete = ref(null);

const { user: onBehalfOfUser, reset: resetOnBehalfOf } = useOnBehalfOf(
  query.onBehalfOf,
  query.token,
);

const { data: user, refresh: refetchUserData } = await useFetch('/api/users/me');
const incomplete = computed(() => {
  return !(
    user.value?.name &&
    user.value?.address &&
    user.value?.identifierType &&
    user.value?.identifierValue
  );
});

const statementTokenUrl =
  user.value?.loginProvider === 'OTP'
    ? `${useRequestURL().origin}/statement?onBehalfOf=${user.value?.email}&token=${user.value?.statementToken}`
    : undefined;

/** @type {import('vue').Ref<import('~/components/UserData.vue').default|null>} */
const userDataSubmit = ref(null);

/** @type {import('vue').Ref<boolean>} */
const geolocationVisible = ref(true);

/** @type {import('vue').Ref<null|import('~~/shared/utils/constants').Commodity>} */
const editCommodity = ref(null);

/** @type {import('vue').Ref<boolean>} */
const savedOnBehalfOf = ref(false);

const map = computed({
  get: () => !!editCommodity.value,
  set: (value) => {
    if (!value) {
      editCommodity.value = null;
    }
  },
});

const treeSpeciesDialogOpen = ref(false);
const confirm = ref(false);

/** @type {ComputedRef<Array<import('~~/server/utils/soap-traces.js').CommodityDataWithKey>>} */
const commoditiesInStatement = computed(() =>
  COMMODITY_KEYS.map((key) => ({ key, ...useStatement(key) })).filter(
    (commodity) => commodity.geojson.value.features.length,
  ),
);

/** @type {ComputedRef<Array<import('~~/server/utils/soap-traces.js').CommodityDataWithKey>>} */
const commoditiesToAdd = computed(() =>
  COMMODITY_KEYS.map((key) => ({ key, ...useStatement(key) })).filter(
    (commodity) => !commodity.geojson.value.features.length,
  ),
);

const canSend = computed(() =>
  COMMODITY_KEYS.some((key) => useStatement(key).geojson.value.features.length),
);

/**
 * @param {import('~~/shared/utils/constants.js').Commodity} commodity
 */
function openEditor(commodity) {
  if (commodity === 'rind' && user.value?.loginProvider !== 'AMA') {
    errorMessage.value =
      'RinderNET Verknüpfung erforderlich - Die Erfassung von Rindern ist nur mit einem eAMA Login möglich. Bitte melden Sie sich mit Ihrem eAMA Account an, um Rinder zu erfassen.';
    return;
  }
  editCommodity.value = commodity;
  const { createSnapshot } = useStatement(commodity);
  createSnapshot();
}

/**
 * @param {import('~~/shared/utils/constants.js').Commodity} commodity
 */
function exitPlaces(commodity) {
  const { modifiedSinceSnapshot } = useStatement(commodity);
  if (!modifiedSinceSnapshot.value) {
    map.value = false;
    return;
  }
  confirm.value = true;
}

/**
 * @param {import('~~/shared/utils/constants.js').Commodity} commodity
 */
function abandonChanges(commodity) {
  const { restoreSnapshot } = useStatement(commodity);
  restoreSnapshot();
  map.value = false;
  confirm.value = false;
}

async function completeUserData() {
  if (!(await userDataComplete.value?.validate())) {
    return;
  }
  await userDataComplete.value?.save();
  await refetchUserData();
}

async function submit() {
  if (!onBehalfOfUser?.value) {
    if (!(await userDataSubmit.value?.validate())) {
      return;
    }
    await userDataSubmit.value?.save();
  }
  try {
    start();
    await $fetch('/api/statements', {
      method: 'POST',
      body: JSON.stringify({
        onBehalfOf: onBehalfOfUser?.value ? onBehalfOfUser.value.id : undefined,
        token: onBehalfOfUser?.value ? onBehalfOfUser.value.statementToken : undefined,
        commodities: COMMODITY_KEYS.map((key) => ({
          key,
          quantity: useStatement(key).quantity.value,
          geojson: useStatement(key).geojson.value,
          speciesList: useStatement(key).speciesList.value,
        })).filter((commodity) => commodity.geojson.features.length),
        geolocationVisible: geolocationVisible.value,
      }),
    });
    await new Promise((r) => setTimeout(r, 1000));
    for (const key of COMMODITY_KEYS) {
      useStatement(key).clear();
    }
    if (onBehalfOfUser?.value) {
      savedOnBehalfOf.value = true;
      const unwatch = watch(savedOnBehalfOf, (value) => {
        if (value === false) {
          unwatch();
          resetOnBehalfOf();
          useRouter().push('/');
        }
      });
    } else {
      useRouter().push('/account');
    }
  } catch (error) {
    if (error instanceof FetchError) {
      errorMessage.value = error.data.message;
    } else if (error instanceof Error) {
      errorMessage.value = error.message;
    }
  } finally {
    finish();
    clear();
  }
}

function validate() {
  if (!editCommodity.value) {
    return true;
  }
  const errors = [];
  const { quantity, geojson } = useStatement(editCommodity.value);

  /** @type {keyof import('~/composables/useStatement').Quantity} */
  let q;
  let sum = 0;
  for (q in quantity.value) {
    sum += quantity.value?.[q] || 0;
  }
  if (sum === 0) {
    errors.push('Zumindest für ein(en) Rohstoff/Erzeugnis muss eine Menge angegeben werden.');
  }
  if (geojson.value.features.length === 0 && sum > 0) {
    errors.push('Es muss mindestens ein Erzeugungsort angegeben werden.');
  }

  if (errors.length) {
    errorMessage.value = errors.join(' ');
    return;
  }
  if (editCommodity.value === 'holz') {
    treeSpeciesDialogOpen.value = true;
    return;
  }
  map.value = false;
}

function saveSpecies() {
  if (!editCommodity.value) {
    return;
  }
  const { speciesList } = useStatement(editCommodity.value);
  if (!speciesList.value?.length) {
    errorMessage.value = 'Bitte geben Sie mindestens eine Baumart an.';
    return;
  }
  treeSpeciesDialogOpen.value = false;
  map.value = false;
}

function cancelSpecies() {
  treeSpeciesDialogOpen.value = false;
  map.value = true;
}
</script>

<template>
  <v-dialog v-model="confirm" max-width="400">
    <v-card v-if="editCommodity">
      <v-card-text>Änderungen werden nicht gespeichert. Möchten Sie fortfahren?</v-card-text>
      <v-card-actions>
        <v-btn @click="confirm = false"> Nein </v-btn>
        <v-btn @click="abandonChanges(editCommodity)"> Ja </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="savedOnBehalfOf" max-width="400">
    <v-card>
      <v-card-text>
        Die Sorgfaltserklärung für {{ onBehalfOfUser?.name }} wurde übermittelt. Sie können nun
        wieder Sorgfaltserklärungen für sich selbst erstellen.
      </v-card-text>
      <v-card-actions>
        <v-btn @click="savedOnBehalfOf = false"> Ok </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="map" fullscreen>
    <v-card v-if="editCommodity">
      <v-toolbar>
        <v-btn :icon="mdiClose" @click="exitPlaces(editCommodity)"></v-btn>

        <v-app-bar-title>{{ COMMODITIES[editCommodity].title }}</v-app-bar-title>

        <v-btn :icon="mdiCheck" :commodity="editCommodity" @click="validate"></v-btn>
      </v-toolbar>
      <places-form :commodity="editCommodity" />
      <places-map
        :commodity="editCommodity"
        :address="(onBehalfOfUser ? onBehalfOfUser.address : user?.address) || undefined"
      />
    </v-card>
  </v-dialog>

  <tree-species-dialog
    v-model="treeSpeciesDialogOpen"
    @save="saveSpecies"
    @cancel="cancelSpecies"
  />

  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card v-if="incomplete">
          <v-card-title>Sorgfaltserklärung</v-card-title>
          <v-card-text class="text-body-1">
            <v-alert color="primary" :icon="mdiAccountEdit">
              Vervollständigen Sie bitte Ihr Profil, um fortzufahren.
            </v-alert>
          </v-card-text>
          <v-card-text>
            <UserData ref="userDataComplete" editable />
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="completeUserData"> Speichern </v-btn>
          </v-card-actions>
        </v-card>
        <v-card v-if="!incomplete">
          <v-card-title>
            Sorgfaltserklärung{{ onBehalfOfUser ? ' für ' + onBehalfOfUser.name : '' }}
          </v-card-title>
          <v-card-text v-if="canSend">
            <UserData v-if="!onBehalfOfUser" ref="userDataSubmit" />
            <v-row>
              <v-col
                v-for="item in commoditiesInStatement"
                :key="item.key"
                :cols="mdAndUp ? 4 : xs ? 12 : 6"
              >
                <CommodityCard :item="item" @open-editor="openEditor" />
              </v-col>
            </v-row>
            <v-checkbox
              v-model="geolocationVisible"
              class="mt-4 checkbox-align-start"
              hide-details
              density="compact"
            >
              <template #label>
                <div class="ml-1 text-body-2">Zugriff auf Erzeugungsorte erlauben</div>
                <v-tooltip max-width="400" open-on-click>
                  <template #activator="{ props }">
                    <v-btn flat :icon="mdiHelpCircleOutline" size="x-small" v-bind="props"></v-btn>
                  </template>
                  <div>
                    Anzeige der von Ihnen angegebenen Produktionsorte in den Sorgfaltserklärungen,
                    die sich auf Ihre Produkte beziehen (z.B. In der Sorgfaltserklärung der Mühle
                    werden alle Referenznummern samt Produktionsort angezeigt, die für die
                    Herstellung des Sojaöls angegeben wurden).
                  </div>
                </v-tooltip>
              </template>
            </v-checkbox>
            <div class="text-body-1 mt-4">
              Hiermit beauftrag{{ onBehalfOfUser ? 't ' + onBehalfOfUser.name : 'e ich' }} das
              Bundesministerium für Land- und Forstwirtschaft, Klima- und Umweltschutz, Regionen und
              Wasserwirtschaft (BMLUK), für {{ onBehalfOfUser ? onBehalfOfUser.name : 'mich' }} als
              Bevollmächtiger im Sinne von Artikel 2 Ziffer 22 der Verordnung (EU) 2023/1115
              aufzutreten und die
              {{ onBehalfOfUser ? 'für ' + onBehalfOfUser.name : 'von mir' }} erstellte
              Sorgfaltserklärung an das Informationssystem gemäß Artikel 33 dieser Verordnung zu
              übermitteln.
              {{ onBehalfOfUser ? onBehalfOfUser.name + ' bestätigt' : 'Ich bestätige' }}, die
              alleinige Verantwortung für den Inhalt der Sorgfaltserklärung zu übernehmen.
            </div>
            <div class="text-body-1 mt-4">
              Durch Übermittlung dieser Sorgfaltserklärung bestätig{{
                onBehalfOfUser ? 't ' + onBehalfOfUser.name : 'e ich'
              }}, die Sorgfaltspflicht gemäß der Verordnung (EU) 2023/1115 durchgeführt zu haben,
              und dass kein oder lediglich ein vernachlässigbares Risiko dahingehend festgestellt
              wurde, dass die relevanten Erzeugnisse gegen Artikel 3 Buchstaben a oder b dieser
              Verordnung verstoßen.
            </div>
            <div v-if="onBehalfOfUser" class="text-body-1 mt-4">
              Ich stimme zu, dass Name und Adresse meines Betriebes gespeichert werden, um mich als
              Ersteller dieser Sorgfaltserklärung für {{ onBehalfOfUser.name }} zuordnen zu können.
            </div>
          </v-card-text>
          <v-card-actions v-if="canSend">
            <v-btn :prepend-icon="mdiCheckDecagram" color="primary" @click="submit">
              Bestätigen und übermitteln
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <template v-if="!incomplete && user?.loginProvider !== 'OTP'">
        <v-col v-for="item in commoditiesToAdd" :key="item.key" :cols="mdAndUp ? 4 : xs ? 12 : 6">
          <CommodityCard :item="item" @open-editor="openEditor" />
        </v-col>
      </template>
      <template v-if="!incomplete && user?.loginProvider === 'OTP'">
        <v-col cols="12">
          <v-card>
            <v-card-title>Jemand anders beauftragen</v-card-title>
            <v-card-text>
              <div class="text-body-1 mb-2">
                Sie können jetzt einen Link zur Erstellung einer Sorgfaltserklärung verschicken.
                <b>Bitte beachten Sie:</b> Nur Personen, die über ein eAMA oder ID Austria Login
                verfügen, können Sorgfaltserklärungen erstellen.
              </div>
              <div class="text-body-1 mb-2">
                Mit der Weitergabe des Links per E-Mail, SMS oder QR-Code nehme ich zur Kenntnis,
                dass die volle Verantwortung für die Richtigkeit der Angaben einer von einer anderen
                Person für mich erstellten Sorgfaltserklärung bei mir liegt. Weiters nehme ich zur
                Kenntnis, dass die interne TRACES Datenbank ID der Sorgfaltserklärung gespeichert
                wird, um diese dem Ersteller zuordnen zu können.
              </div>
            </v-card-text>
            <v-card-actions>
              <v-btn
                text="E-Mail"
                :prepend-icon="mdiEmailFastOutline"
                color="primary"
                :href="`mailto:?subject=EUDR Sorgfaltserklärung für ${user.name}&body=${encodeURIComponent(`Bitte erstellen Sie eine EUDR Sorgfaltserklärung für ${user.name}: ${statementTokenUrl}`)}`"
              ></v-btn>
              <v-btn
                text="SMS"
                :prepend-icon="mdiMessageTextOutline"
                color="primary"
                :href="`sms:?body=${encodeURIComponent(`Bitte erstellen Sie für ${user.name} eine EUDR Sorgfaltserklärung: ${statementTokenUrl}`)}`"
              ></v-btn>
              <qr-code-button color="primary" :payload="statementTokenUrl"></qr-code-button>
            </v-card-actions>
          </v-card>
        </v-col>
      </template>
    </v-row>
  </v-container>
</template>

<style scoped>
.fill-width {
  width: 100%;
}
</style>
