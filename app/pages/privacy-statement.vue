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
              Neben dem BMLUK ist bei Verwendung dieser Applikation auch die EU-Kommission als
              Betreiberin des Informationssystems gemäß Artikel 33 der Verordnung (EU) 2023/1115
              (TRACES-Datenbank) als Verantwortliche für die Verarbeitung personenbezogener Daten
              anzusehen. Die Verarbeitung dieser Daten liegt außerhalb des Verantworungsbereiches
              des BMLUK. Die Datenschutzerklärung der EU-Kommission für die TRACES-Datenbank ist
              unter
              <a
                href="https://eudr.webcloud.ec.europa.eu/tracesnt/privacy-statement"
                target="_blank"
                >https://eudr.webcloud.ec.europa.eu/tracesnt/privacy-statement</a
              >
              abrufbar.
            </div>
            <div class="text-body-1 mb-2">
              Vom BMLUK werden im Rahmen der Nutzung dieser Applikation keine personenbezogenen
              Daten gespeichert.
            </div>
            <div class="text-body-1 mb-2">
              Ausnahmen:
              <ul class="pl-4 mt-2">
                <li class="mb-1">
                  Bei Anmeldung mit ID Austria wird auf der Seite "Mein Konto" unter "Angaben zum
                  Betrieb" die Identifikationsnummer (GLN, UID oder Steuernummer) zum Zweck der
                  Erstellung von Sorgfaltserklärungen gespeichert.
                </li>
                <li class="mb-1">
                  Bei Anmeldung mit E-Mail werden auf der Seite "Mein Konto" unter "Angaben zum
                  Betrieb" die E-Mail Adresse, Name, Adresse und Identifikationsnummer (GLN, UID
                  oder Steuernummer) zum Zweck der Erstellung und Verwaltung von
                  Sorgfaltserklärungen gespeichert.
                </li>
                <li class="mb-1">
                  Sofern Sie für jemand anderen eine Sorgfaltserklärung erstellen, werden Name und
                  Adresse Ihres Betriebes gespeichert, um Sie als Ersteller der Sorgfaltserklärung
                  zuordnen zu können.
                </li>
                <li class="mb-1">
                  Sofern Sie von jemand anderem eine Sorgfaltserklärung erstellen lassen, wird die
                  interne ID der Sorgfaltserklärung, die von der TRACES Datenbank der EU-Kommission
                  vergeben wird gespeichert, um die Sorgfaltserklärung dem Konto des Erstellers
                  zuordnen zu können.
                </li>
              </ul>
            </div>
            <div class="text-body-1 mb-2">
              Wenn Sie von einer der oben genannten Ausnahmen betroffen sind, können Sie jederzeit
              durch formlose Mitteilung an
              <a href="mailto:service.entwaldung@bmluk.gv.at">service.entwaldung@bmluk.gv.at</a>
              die Löschung Ihrer vom BMLUK gespeicherten Daten beantragen.
            </div>
            <div class="text-body-1 mb-2">
              Bei Klicken der Schaltfläche "Bestätigen und Übermitteln" auf der Seite
              "Sorgfaltserklärung" wird zum Zweck der Verknüpfung mit dieser Applikation Ihre
              Benutzer-ID (LFBIS-Nummer bei eAMA Login, e-mail Adresse bei E-Mail Login) als interne
              Referenz an die TRACES-Datenbank übermittelt.
            </div>
            <div class="text-body-1 mb-2">
              Bei Klicken der Schaltfläche "Bestätigen und Übermitteln" auf der Seite
              "Sorgfaltserklärung" werden Name und Adresse des Betriebes, die Identifikationsnummer,
              sowie die für die Sorgfaltserklärung erfassten Flächen- bzw. Punktdaten, Erzeugnisse,
              und deren Mengen an die TRACES-Datenbank übermittelt, da diese Angaben für die
              Sorgfaltserklärung verpflichtend sind.
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
