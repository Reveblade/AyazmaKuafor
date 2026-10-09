import { createServer } from 'node:http';
import { getRequestListener } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { config, assertProductionSecrets } from './config.js';
import { connectDb } from './db.js';
import { publicRoutes } from './routes/public.js';
import { adminRoutes } from './routes/admin.js';
import { initSocket } from './socket.js';

assertProductionSecrets();

const app = new Hono();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: config.corsOrigins,
    credentials: true,
  }),
);

app.route('/', publicRoutes);
app.route('/admin', adminRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal server error' }, 500);
});

async function main() {
  await connectDb();

  const httpServer = createServer(getRequestListener(app.fetch));

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${config.port} is already in use. Stop the other process or change PORT.`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });

  httpServer.listen(config.port, () => {
    console.log(`API running on http://localhost:${config.port}`);
  });

  initSocket(httpServer);
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
