import { Router } from 'express';
import { EstatisticaController } from '../controllers/estatisticaController.js';

const router = Router();

router.get('/', EstatisticaController.getEstatisticas);
router.get('/relatorio', EstatisticaController.getRelatorio);

export default router;
