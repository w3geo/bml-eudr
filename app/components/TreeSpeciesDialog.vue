<script setup>
const treeSpeciesList = [
  // [scientific name, common name]
  ['Picea abies', 'Fichte'],
  ['Pinus silvestris', 'Weißkiefer'],
  ['Larix decidua', 'Lärche'],
  ['Abies alba', 'Tanne'],
  ['Pinus cembra', 'Zirbe'],
  ['Pinus nigra var. austriaca', 'Schwarzkiefer'],
  ['Pseudotsuga ssp.', 'Douglasie'],
  ['Fagus sylvatica', 'Rotbuche'],
  ['Quercus ssp.', 'Eiche'],
  ['Acer ssp.', 'Ahorn'],
  ['Fraxinus excelsior', 'Esche'],
  ['Populus ssp.', 'Pappel'],
  ['Carpinus betulus', 'Hainbuche'],
  ['Tilia ssp.', 'Linde'],
  ['Alnus ssp.', 'Erle'],
  ['Betula pendula', 'Birke'],
  ['Juniperus communis', 'Gemeiner Wacholder'],
  ['Pinus mugo', 'Picea'],
  ['Taxus baccata', 'Eibe'],
  ['Acer campestre', 'Feldahorn'],
  ['Acer platanoides', 'Spitzahorn'],
  ['Acer pseudoplatanus', 'Bergahorn'],
  ['Aesculus hippocastanum', 'Roßkastanie'],
  ['Alnus glutinosa', 'Schwarzerle'],
  ['Alnus incana', 'Weiß-(Grau-)erle'],
  ['Alnus viridis', 'Grünerle'],
  ['Betula pubescens', 'Moorbirke'],
  ['Castanea sativa', 'Edelkastanie'],
  ['Corylus avellana', 'Hasel'],
  ['Fraxinus ornus', 'Mannaesche'],
  ['Juglans regia', 'Walnuss'],
  ['Malus sylvestris', 'Wildapfel'],
  ['Ostrya carpinifolia', 'Hopfenbuche'],
  ['Populus alba', 'Silberpappel'],
  ['Populus canescens', 'Graupappel'],
  ['Populus nigra', 'Schwarzpappel'],
  ['Populus tremula', 'Zitterpappel'],
  ['Prunus avium', 'Vogelkirsche'],
  ['Prunus padus', 'Traubenkirsche'],
  ['Pyrus pyraster', 'Wildbirne'],
  ['Quercus cerris', 'Zerreiche'],
  ['Quercus petraea', 'Traubeneiche'],
  ['Quercus pubescens', 'Flaumeiche'],
  ['Quercus robur', 'Stieleiche'],
  ['Robinia pseudacacia', 'Robinie'],
  ['Sorbus aria', 'Mehlbeere'],
  ['Sorbus aucuparia', 'Eberesche (Vogelbeere)'],
  ['Sorbus domestica', 'Speierling'],
  ['Sorbus torminalis', 'Elsbeere'],
  ['Tilia cordata', 'Winterlinde'],
  ['Tilia platyphyllos', 'Sommerlinde'],
  ['Ulmus glabra', 'Bergulme'],
  ['Ulmus laevis', 'Flatterulme'],
  ['Ulmus minor', 'Feldulme'],
  ['Salix ssp.', 'Weide'],
  ['Abies ssp.', 'fremdländische Tanne'],
  ['Cedrus ssp.', 'Zeder'],
  ['Chamaecyparis ssp.', 'Zypresse'],
  ['Larix ssp.', 'fremdländische Lärche'],
  ['Metasequoia ssp.', 'Mammutbaum'],
  ['Picea ssp.', 'fremdländische Fichte'],
  ['Pinus ssp.', 'fremdländische Kiefer'],
  ['Thuja ssp.', 'Thuje'],
  ['Tsuga ssp.', 'Hemlocktanne'],
  ['Acacieae', 'Akazie'],
  ['Acer ssp.', 'fremdländische Ahorn'],
  ['Ailanthus altissima', 'Götterbaum'],
  ['Betula ssp.', 'fremdländische Birke'],
  ['Carya ssp.', 'Hickory'],
  ['Celtis ssp.', 'Zürgelbaum'],
  ['Corylus ssp.', 'fremdländische Hasel'],
  ['Elaeagnus ssp.', 'Ölweide'],
  ['Fagus ssp.', 'fremdländische Buche'],
  ['Fraxinus ssp.', 'fremdländische Esche'],
  ['Ginkgo biloba', 'Ginkgo'],
  ['Gleditsia ssp.', 'Gleditschie'],
  ['Juglans ssp.', 'fremdländische Walnuss'],
  ['Liriodendron ssp.', 'Tulpenbaum'],
  ['Morus ssp.', 'Maulbeere'],
  ['Paulownia tomentosa', 'Blauglockenbaum'],
  ['Platanus ssp.', 'Platane'],
  ['Populus ssp.', 'fremdländische Pappel oder Hybride'],
  ['Prunus ssp.', 'fremdländische Prunusart'],
  ['Quercus ssp.', 'fremdländische Eiche oder Hybride'],
  ['Styphnolobium japonicum', 'Japanischer Schnurbaum'],
];

const opened = defineModel({ type: Boolean, required: true });
const emit = defineEmits(['save']);

const selectedTreeSpecies = ref([]);
</script>

<template>
  <v-dialog v-model="opened" max-width="500">
    <v-card>
      <v-card-title>Holz von welchen Baumarten?</v-card-title>
      <v-card-text>
        <v-combobox
          v-model="selectedTreeSpecies"
          autofocus
          variant="outlined"
          density="compact"
          :items="treeSpeciesList"
          :item-title="(item) => (Array.isArray(item) ? `${item[0]} [${item[1]}]` : item)"
          item-value="0"
          label="Baumarten suchen/auswählen"
          multiple
          chips
          closable-chips
          auto-select-first
        ></v-combobox>
      </v-card-text>
      <v-card-actions>
        <v-btn color="secondary" text @click="opened = false"> Abbrechen </v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          @click="
            emit('save', selectedTreeSpecies);
            opened = false;
          "
        >
          Speichern
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
