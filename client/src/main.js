import './assets/main.css';
import 'vuetify/styles';

import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import App from './App.vue';
import router from './router';

const app = createApp(App);

app.use(createVuetify());

app.use(router);

app.mount('#app');
