import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/arxiv': {
        target: 'https://export.arxiv.org/api', 
        changeOrigin: true, 
        rewrite: (path) => path.replace(/^\/api\/arxiv/, '')
      },
	  '/api/hf': {
        target: 'https://api-inference.huggingface.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hf-api/, ''),
        secure: false,
      },
	  '/api/chemrxiv': {
        target: 'https://chemrxiv.org/engage/chemrxiv/public-api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/chemrxiv/, ''),
      }
    }
  }
})

