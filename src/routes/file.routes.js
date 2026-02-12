import express from 'express';
import * as fileController from '../controllers/file.controller.js';

const router = express.Router();

// GET /api/files/:id - serve image binary
router.get('/:id', fileController.getFile);

export default router;





