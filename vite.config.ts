/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base must match the GitHub Pages project path:
// https://josiahhoi.github.io/Year-At-A-Glance-Calendar/
export default defineConfig({
  base: '/Year-At-A-Glance-Calendar/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
