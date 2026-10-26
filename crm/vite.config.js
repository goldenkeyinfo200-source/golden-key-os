
import { defineConfig } from 'vite';

const allowedHosts = [
  'crm-production-8db4.up.railway.app',
  'crm-production-eced.up.railway.app',
  'localhost'
];

export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts
  }
});
