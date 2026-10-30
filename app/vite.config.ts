import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig({
  plugins: [react()],

  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },

  build: {
    target: 'es2020',
    cssCodeSplit: true,
    cssMinify: 'lightningcss',
    sourcemap: false,
    assetsInlineLimit: 2048,
    reportCompressedSize: true,
    rollupOptions: {
      // Vite 8 builds with rolldown/oxc. Marking the console members pure lets
      // dead-code elimination drop the calls from production output entirely.
      treeshake: {
        manualPureFunctions: ['console.log', 'console.debug', 'console.info'],
      },
      output: {
        // React changes rarely; keep it in its own long-lived chunk.
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
            return 'react';
          }
          return undefined;
        },
      },
    },
  },

});
