import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase } from './config/database.js';
import movimientosRoutes from './routes/movimientosRoutes.js';
import { getHealth } from './controllers/healthController.js';

dotenv.config();

const app = express();
app.disable('x-powered-by');
const PORT = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}
const HOST = '127.0.0.1';
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middlewares
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10kb' }));

// Logging middleware
app.use((req, _res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// Rutas
app.get('/api/health', getHealth);
app.use('/api/movimientos', movimientosRoutes);

// Iniciar servidor y conectar a base de datos
app.listen(PORT, HOST, async () => {
  console.log(`🚀 [Backend] Servidor ejecutándose en http://${HOST}:${PORT}`);
  console.log(`📋 [API Endpoints] Disponibles en http://${HOST}:${PORT}/api/movimientos`);
  console.log(`🔍 [Health Check] http://${HOST}:${PORT}/api/health`);

  // Verifica el acceso a SQL Server a través de la API corporativa.
  await connectToDatabase();
});

export default app;
