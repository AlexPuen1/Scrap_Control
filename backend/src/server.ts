import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase } from './config/database.js';
import movimientosRoutes from './routes/movimientosRoutes.js';
import { getHealth } from './controllers/healthController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middlewares
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Logging middleware
app.use((req, _res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Rutas
app.get('/api/health', getHealth);
app.use('/api/movimientos', movimientosRoutes);

// Iniciar servidor y conectar a base de datos
app.listen(PORT, async () => {
  console.log(`🚀 [Backend] Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📋 [API Endpoints] Disponibles en http://localhost:${PORT}/api/movimientos`);
  console.log(`🔍 [Health Check] http://localhost:${PORT}/api/health`);

  // Verifica el acceso a SQL Server a través de la API corporativa.
  await connectToDatabase();
});

export default app;
