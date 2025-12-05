import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Plugin to create _redirects file for Netlify SPA routing
const writeRedirects = () => {
  return {
    name: 'write-redirects',
    closeBundle() {
      const distDir = path.resolve('dist');
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }
      const redirectPath = path.resolve(distDir, '_redirects');
      fs.writeFileSync(redirectPath, '/* /index.html 200');
      console.log('_redirects file created in dist folder');
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), writeRedirects()],
    base: "./", // Ensures relative paths for assets
    define: {
      'process.env': env
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
    }
  };
});