import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: [
      'crm-production-eced.up.railway.app'
    ]
  },

  preview: {
    host: '0.0.0.0',
    allowedHosts: [
      'crm-production-eced.up.railway.app'
    ]
  }
});