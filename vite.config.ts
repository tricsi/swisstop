import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset URLs, so the build works under a sub-path such as
  // https://<user>.github.io/<repo>/ as well as on a custom domain.
  base: './',
  plugins: [react()],
})
