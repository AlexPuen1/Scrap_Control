import { Router } from 'express';
import {
  getMovimientos,
  getAprobaciones,
  getPreciosScrap,
  getMovimientoById,
  getScrapPorLinea,
  getRazones,
  actualizarRazon,
  registrarDictamen,
  getComparativaMensual,
} from '../controllers/movimientosController.js';
import { exigirRoles } from '../middleware/authentication.js';

const router = Router();

router.get('/', getMovimientos);
router.get('/aprobaciones', getAprobaciones);
router.get('/precios', getPreciosScrap);
router.get('/comparativa-mensual', exigirRoles('Administrador'), getComparativaMensual);
router.get('/fallas-por-linea', exigirRoles('Administrador'), getScrapPorLinea);
router.get('/razones', exigirRoles('Administrador'), getRazones);
router.patch('/:id/razon', exigirRoles('Administrador'), actualizarRazon);
router.patch('/:id/dictamen', registrarDictamen);
router.get('/:id', getMovimientoById);

export default router;
