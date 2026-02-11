import { createServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const server = await createServer({
    root: __dirname,
    server: {
      middlewareMode: false,
      port: 5173,
      hmr: {
        host: 'localhost',
        port: 5173
      }
    }
  });
  
  await server.listen();
  console.log('✨ Vite dev server running at http://localhost:5173');
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
