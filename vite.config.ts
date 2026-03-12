import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3001,
    host: '0.0.0.0',
    proxy: {
      '/supabase-proxy': {
        target: 'https://jimjdmypymhqyzjjwqyb.supabase.co',
        changeOrigin: true,
        rewrite: (urlPath) => urlPath.replace(/^\/supabase-proxy/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Remove cookies to resolve potential 431 Request Header Fields Too Large errors
            proxyReq.setHeader('cookie', '');
          });
        },
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
