import { defineConfig } from 'vite'

// base: './' => относительные пути, работают и на user/project GitHub Pages,
// и при открытии собранного dist локально.
export default defineConfig({
  base: './',
  build: {
    target: 'es2018',
    assetsInlineLimit: 4096,
  },
})
