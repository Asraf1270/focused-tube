import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';
import eslint from 'vite-plugin-eslint';
import checker from 'vite-plugin-checker';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      // React plugin with Fast Refresh
      react({
        jsxRuntime: 'automatic',
        babel: {
          plugins: [
            // Remove console in production
            mode === 'production' && ['transform-remove-console', { exclude: ['error', 'warn'] }],
          ].filter(Boolean),
        },
      }),
      
      // ESLint integration
      eslint({
        cache: true,
        fix: true,
      }),
      
      // Type checking
      checker({
        typescript: true,
        overlay: {
          initialIsOpen: false,
        },
      }),
      
      // PWA support
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt'],
        manifest: {
          name: 'FocusedTube',
          short_name: 'FocusedTube',
          description: 'A distraction-free YouTube alternative for personal learning',
          theme_color: '#0A0A0A',
          background_color: '#0A0A0A',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/img\.youtube\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'youtube-thumbnails',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
                },
              },
            },
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60, // 1 hour
                },
              },
            },
          ],
        },
      }),
      
      // Gzip compression
      compression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240, // 10KB
      }),
      
      // Brotli compression (better than gzip)
      compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 10240,
      }),
      
      // Bundle analyzer (only when analyzing)
      mode === 'analyze' && visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/stats.html',
      }),
    ].filter(Boolean),

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@lib': path.resolve(__dirname, './src/lib'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@contexts': path.resolve(__dirname, './src/contexts'),
        '@providers': path.resolve(__dirname, './src/providers'),
        '@styles': path.resolve(__dirname, './src/styles'),
        '@assets': path.resolve(__dirname, './src/assets'),
        '@types': path.resolve(__dirname, './src/types'),
      },
    },

    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode !== 'production',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
        },
        mangle: {
          safari10: true,
        },
        output: {
          comments: false,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'supabase-vendor': ['@supabase/supabase-js'],
            'query-vendor': ['@tanstack/react-query'],
            'ui-vendor': ['framer-motion', '@headlessui/react'],
            'utils-vendor': ['date-fns', 'clsx', 'tailwind-merge', 'zustand'],
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },
      chunkSizeWarningLimit: 1000,
      cssCodeSplit: true,
      cssMinify: true,
      reportCompressedSize: false,
    },

    server: {
      port: 5173,
      host: true,
      open: true,
      cors: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    preview: {
      port: 4173,
      host: true,
      open: false,
    },

    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        '@tanstack/react-query',
        'framer-motion',
        'date-fns',
        'clsx',
        'tailwind-merge',
        'zustand',
      ],
      exclude: [],
    },

    css: {
      devSourcemap: true,
      modules: {
        localsConvention: 'camelCase',
      },
    },
  };
});