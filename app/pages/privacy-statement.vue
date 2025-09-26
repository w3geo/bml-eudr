<script setup>
definePageMeta({
  title: 'Datenschutzerklärung',
  sort: 50,
});
useSeoMeta({
  title: 'Datenschutz',
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>Datenschutzerklärung</v-card-title>
          <v-card-text>
            <div class="text-body-1 mb-2">
              Diese Seite beschreibt, welche personenbezogenen Daten im Rahmen der Nutzung dieser
              Applikation gemäß den gesetzlichen Bestimmungen (DSGVO, TKG 2021) vom
              Bundesministerium für Land- und Forstwirtschaft, Klima- und Umweltschutz, Regionen und
              Wasserwirtschaft (BMLUK) verarbeitet werden, zu welchem Zweck dies geschieht, und
              welche Rechte Sie in Bezug auf Ihre Daten haben. Bei Fragen dazu wenden Sie sich bitte
              an
              <a href="mailto:service.entwaldung@bmluk.gv.at">service.entwaldung@bmluk.gv.at</a>.
            </div>
            <div class="text-body-1 mb-2">
              Auf der Seite "Mein Konto" unter "Angaben zum Betrieb", werden die von Ihnen
              eingegebenen persönlichen Daten, nämlich bei Verwendung der Login-Methode "E-Mail"
              Name, Adresse, e-mail Adresse und Identifikationsnummer (GLN, UID oder Steuernummer),
              alternativ dazu bei Verwendung der Login-Methode "eAMA" die LFBIS-Nummer des
              Betriebes, und alternativ dazu bei Verwendung der Login-Methode "ID Austria" die
              Identifikationsnummer (GLN, UID oder Steuernummer), zum Zweck der Erstellung von
              Sorgfaltserklärungen gespeichert.
            </div>
            <div class="text-body-1 mb-2">
              Nach Erstellung einer Sorgfaltserklärung wird die von der TRACES Datenbank der EU
              Kommission bereitgestellte ID der Sorgfaltserklärung zum Zweck der Zurodnung derselben
              zu Ihrem Benutzerkonto gespeichert.
            </div>
            <div class="text-body-1 mb-2">
              Sie können jederzeit durch formlose Mitteilung mit Angabe Ihrer Benutzer-ID (siehe
              rechts oben in der grünen Titelleiste) an
              <a href="mailto:service.entwaldung@bmluk.gv.at">service.entwaldung@bmluk.gv.at</a>
              die Löschung Ihres Benutzerkontos beantragen, womit sämtliche vom BMLUK gespeicherten
              Daten gelöscht werden. Aus technischen Gründen ist danach über die Applikation kein
              Zugriff auf die Referenz- und Verifikationsnummern der mit der Applikation erstellten
              Sorgfaltserklärungen mehr möglich. Sollten Sie später wieder Zugriff auf diese
              Referenz- und Verifikationsnummern benötigen, müssen Sie sich erneut mit der gleichen
              Login-Methode und dem gleichen Benutzer anmelden.
            </div>
            <div class="text-body-1 mb-2">
              Bei Klicken der Schaltfläche "Übermitteln" auf der Seite "Sorgfaltserklärung" werden
              Ihre Benutzer-ID als interne Referenz (LFBIS-Nummer bei eAMA Login, bPK bei ID Austria
              Login, e-mail Adresse bei E-Mail Login), Name und Adresse des Betriebes, die
              Identifikationsnummer, sowie die für die Sorgfaltserklärung erfassten Flächen- bzw.
              Punktdaten, Erzeugnisse, und deren Mengen an die TRACES Datenbank der EU-Kommission
              übermittelt. Die dortige Verarbeitung dieser Daten liegt außerhalb des
              Verantworungsbereiches des BMLUK. Die Datenschutzerklärung der EU-Kommission für die
              TRACES Datenbank ist unter
              <a
                href="https://eudr.webcloud.ec.europa.eu/tracesnt/privacy-statement"
                target="_blank"
                >https://eudr.webcloud.ec.europa.eu/tracesnt/privacy-statement</a
              >
              abrufbar.
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
