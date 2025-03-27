import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Configure Vitest
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.js", // Optional setup file
    // You might want to disable CSS processing for tests if not needed
    // css: false,
  },
  // Optional: Configure server proxy if running Vite dev server
  // and want it to proxy /api requests to backend (alternative to Nginx in dev)
  // server: {
  //   proxy: {
  //     '/api': {
  //       target: 'http://localhost:8000', // Your backend address
  //       changeOrigin: true,
  //       // rewrite: (path) => path.replace(/^\/api/, ''), // Remove /api prefix if backend doesn't expect it
  //     }
  //   }
  // }
});
