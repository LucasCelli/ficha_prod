import { Router } from 'express';
import fichaRoutes from './fichaRoutes.js';
import clienteRoutes from './clienteRoutes.js';
import estatisticaRoutes from './estatisticaRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    database: 'connected',
    timestamp: new Date().toISOString(),
    version: '3.0.0'
  });
});

router.use('/fichas', fichaRoutes);
router.use('/clientes', clienteRoutes);
router.use('/estatisticas', estatisticaRoutes);
router.use('/relatorio', estatisticaRoutes);

export default router;
