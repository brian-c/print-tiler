import { createApp } from 'vue';
import App from './App.vue';
import './global.css';

const appRoot = document.getElementById('app');
if (!appRoot) throw new Error('Missing #app');

createApp(App).mount('#app');
