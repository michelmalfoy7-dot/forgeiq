import { defineConfig } from 'vitest/config'

// Tests des calculs purs (TDEE, macros, poids, tonnage, recovery…).
// Environnement node — pas de DOM nécessaire pour des fonctions pures.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'tests/**/*.test.ts'],
    globals: false,
  },
})
