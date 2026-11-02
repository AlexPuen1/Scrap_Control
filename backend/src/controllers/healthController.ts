import type { Request, Response } from 'express';
import { isDbConnected } from '../config/database.js';

export function getHealth(_req: Request, res: Response) {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    database: {
      connected: isDbConnected(),
    },
  });
}
