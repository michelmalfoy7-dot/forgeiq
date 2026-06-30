import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Racine du projet — pour résoudre l'alias "@/" comme dans tsconfig (@/* → ./*)
const projectRoot = fileURLToPath(new URL('.', import.meta.url)).replace(/[/\\]$/, '')

// Tests des calculs purs (TDEE, macros, poids, tonnage, recovery, ISO…).
// Environnement node — pas de DOM nécessaire pour des fonctions pures.
export default defineConfig({
  resolve: {
    alias: { '@': projectRoot },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'tests/**/*.test.ts'],
    globals: false,
  },
})
