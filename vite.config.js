import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Whenever our app requests a URL starting with '/api', Vite catches it
      '/api/arxiv': {
        target: 'https://export.arxiv.org', // The actual destination
        changeOrigin: true, // Spoof the origin header to trick arXiv into accepting it
         rewrite: (path) => path.replace(/^\/api\/arxiv/, '/api')
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

