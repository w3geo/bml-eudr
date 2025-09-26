<script setup>
const { loggedIn } = useUserSession();
const showDisclaimer = ref(!loggedIn.value);
</script>
<template>
  <v-dialog v-model="showDisclaimer" persistent scrollable>
    <v-card title="Haftungsausschluss">
      <v-card-text>
        <div class="text-subtitle-1 mb-2">Sehr geehrte Benutzerin, sehr geehrter Benutzer,</div>

        <div class="text-body-1 mb-2">
          herzlichen Dank, dass Sie das Tool zur EUDR Meldung (in der Folge „Tool“) des BMLUK
          verwenden. Dieses dient der einfacheren Abgabe Ihrer Sorgfaltserklärung im Rahmen der
          EU-Entwaldungsverordnung [Verordnung (EU) 2023/1115].
        </div>

        <div class="text-body-1 mb-2">
          Aus den im Tool angezeigten Karteninhalten (Darstellungen) und den dazugehörenden Texten
          können Rechtsansprüche weder begründet noch abgeleitet werden. Das Bundesministerium für
          Land- und Forstwirtschaft, Regionen und Wasserwirtschaft (BMLUK) übernimmt keine Haftung
          für Richtigkeit, Vollständigkeit, Aktualität oder dauernde Verfügbarkeit dieses Tools. Die
          Karten und Texte sind keine amtliche Auskunft oder rechtsverbindliche Aussage. Amtliche
          Auskünfte zu einem bestimmten Gebiet oder einer bestimmten Frage erteilt auf Anfrage die
          zuständige Behörde. Alle Angaben (Berechnungsergebnisse) sind trotz sorgfältigster
          Bearbeitung/Verarbeitung ohne Gewähr und nicht rechtsverbindlich. Für Eingaben im Tool
          haftet überdies derjenige, der sich ihm bedient oder der es für einen anderen verwendet.
          Eine Haftung des BMLUK für Nachteile, die aufgrund des Tools angezeigten und abgefragten
          Inhalte entstanden sind, wird ausgeschlossen. Das BMLUK behält sich ausdrücklich vor,
          Inhalte des Tools jederzeit ohne Ankündigung ganz oder teilweise zu ändern, zu ergänzen,
          zu löschen oder zeitweise nicht zu veröffentlichen.
        </div>

        <div class="text-body-1 mb-2">
          Das Tool wird vom Unternehmen
          <a href="https://w3geo.at" target="_blank">w3geo GmbH</a> betrieben. w3geo übernimmt
          keinerlei Haftung für Schäden oder Mängelfolgeschäden, welche durch die Verwendung dieses
          Webdienstes und all seiner Inhalte entstehen. Die Nutzung der Inhalte dieses Webdienstes
          erfolgt ausschließlich auf Risiko der Benutzerin bzw. des Benutzers.
        </div>

        <div class="text-body-1 mb-2">
          Anmerkung zur Barrierefreiheit: Diese Webseite ist mit dem Bundesgesetz über den
          barrierefreien Zugang zu Websites und mobilen Anwendungen des Bundes
          (Web-Zugänglichkeits-Gesetz – WZG), BGBl. I Nr. 59/2019 vereinbar.
        </div>

        <div class="text-body-1 mb-2">
          Gemäß § 2 Abs. 3 lit. d muss die Webseite nicht den, in dem oben angeführten Bundesgesetz
          normierten Anforderungen an die Barrierefreiheit genügen, da Online-Karten und
          Kartendienste, die nicht der Navigation dienen, vom Regelungsumfang ausgenommen sind. Bei
          Fragen zur barrierefreien Lesbarkeit des Kartenteiles wenden Sie sich bitte an den im
          Impressum angegebenen Kontakt.
        </div>
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-btn color="primary" @click="showDisclaimer = false">Akzeptieren</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
