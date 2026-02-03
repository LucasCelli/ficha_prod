import { Router } from 'express';
import { ClienteController } from '../controllers/clienteController.js';

const router = Router();

router.get('/', ClienteController.getAll);

export default router;
