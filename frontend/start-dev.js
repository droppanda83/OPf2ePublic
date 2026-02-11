const { createServer } = require('vite');
const path = require('path');

async function startServer() {
  const server = await createServer({
    root: path.resolve(__dirname),
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
