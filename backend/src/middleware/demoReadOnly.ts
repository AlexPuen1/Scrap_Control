import type { RequestHandler } from 'express';

export const bloquearEscriturasDemo: RequestHandler = (req, res, next) => {
  if (req.method === 'PATCH' && !/^\/[1-9]\d*\/dictamen$/.test(req.path)) {
    res.status(403).json({
      exitoso: false,
      mensaje: 'Esta operación de escritura no está habilitada.',
    });
    return;
  }
  next();
};
