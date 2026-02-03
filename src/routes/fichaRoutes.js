import { Router } from 'express';
import { FichaController } from '../controllers/fichaController.js';
import { validate } from '../middlewares/validate.js';
import { fichaSchema, fichaFiltrosSchema } from '../validators/fichaValidator.js';

const router = Router();

router.get('/', validate(fichaFiltrosSchema, 'query'), FichaController.getAll);
router.get('/vendedores', FichaController.getVendedores);
router.get('/:id', FichaController.getById);
router.post('/', validate(fichaSchema), FichaController.create);
router.put('/:id', validate(fichaSchema), FichaController.update);
router.patch('/:id/entregar', FichaController.markAsDelivered);
router.delete('/:id', FichaController.delete);

export default router;
