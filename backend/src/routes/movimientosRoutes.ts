import { Router } from 'express';
import {
  getMovimientos,
  getAprobaciones,
  getMovimientoById,
  getScrapPorLinea,
  getRazones,
  actualizarRazon,
  registrarDictamen,
  getComparativaMensual,
} from '../controllers/movimientosController.js';

const router = Router();

router.get('/', getMovimientos);
router.get('/aprobaciones', getAprobaciones);
router.get('/comparativa-mensual', getComparativaMensual);
router.get('/fallas-por-linea', getScrapPorLinea);
router.get('/razones', getRazones);
router.patch('/:id/razon', actualizarRazon);
router.patch('/:id/dictamen', registrarDictamen);
router.get('/:id', getMovimientoById);

export default router;
