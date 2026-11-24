import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDatabase, dbPath } from './db/index.js';
import { seedDatabase } from './db/seed.js';
import { pullDatabaseFromNeon, pushDatabaseToNeon } from './db/neonSync.js';
import { setupAuctionSockets } from './socket/auctionSocket.js';

import tournamentsRouter from './routes/tournaments.js';
import auctionsRouter from './routes/auctions.js';
import teamsRouter from './routes/teams.js';
import playersRouter from './routes/players.js';
import retentionsRouter from './routes/retentions.js';
import reportsRouter from './routes/reports.js';
import auditRouter from './routes/audit.js';
import authRouter from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with permissive CORS
const io = new SocketServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize DB and Seed
initDatabase();
seedDatabase();

// Neon Central Database Synchronization Middleware with concurrency lock
let dbSyncPromise: Promise<void> | null = null;
function ensureDbSynced(): Promise<void> {
  if (!dbSyncPromise) {
    dbSyncPromise = (async () => {
      try {
        await pullDatabaseFromNeon();
      } catch (e) {
        console.error('[DB] Initial pull error:', e);
      }
      initDatabase();
      seedDatabase();
    })();
  }
  return dbSyncPromise;
}

app.use(async (req, res, next) => {
  await ensureDbSynced();

  // If request modifies database, push snapshot to Neon before completing response
  // to prevent serverless freeze while network socket is active
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const originalEnd = res.end.bind(res);
    let pushed = false;
    res.end = function (...args: any[]) {
      if (!pushed && res.statusCode >= 200 && res.statusCode < 400) {
        pushed = true;
        pushDatabaseToNeon()
          .catch((err) => console.error('[NEON AUTO-SYNC ERROR]', err))
          .finally(() => {
            originalEnd(...args);
          });
        return res;
      }
      return originalEnd(...args);
    } as any;
  }
  next();
});

// Setup Real-time Auction Sockets
setupAuctionSockets(io);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/auctions', auctionsRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/players', playersRouter);
app.use('/api/retentions', retentionsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/audit', auditRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend build in production if exists
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) {
      res.status(200).send('API Server is running.');
    }
  });
});

const PORT = process.env.PORT || 5001;
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`[PPL CONNECT SERVER] Running on http://localhost:${PORT}`);
  });
}

export { app, server };
export default app;
