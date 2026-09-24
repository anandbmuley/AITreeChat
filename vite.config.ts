import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Gemini REST endpoint does not answer browser CORS preflights (custom
// Api-Revision header), so the client calls /gemini-api/* and the server
// forwards it. Deployed builds need an equivalent reverse proxy.
const geminiProxy = {
  '/gemini-api': {
    target: 'https://generativelanguage.googleapis.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/gemini-api/, ''),
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: geminiProxy,
  },
  preview: {
    proxy: geminiProxy,
  },
});
