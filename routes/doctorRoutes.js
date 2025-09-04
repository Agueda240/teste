// routes/doctorRoutes.js
const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const authMiddleware = require('../middleware/authMiddleware');

// Registro e login públicos para médicos
router.post('/register', doctorController.registerDoctor);
router.post('/login', doctorController.loginDoctor);
router.post('/forgot-password', doctorController.forgotPassword);

// Rotas protegidas para o médico autenticado
router.get('/profile', authMiddleware, doctorController.getDoctorProfile);
router.get('/', authMiddleware, doctorController.getAllDoctors);

router.put('/:id', authMiddleware, doctorController.updateDoctor);
router.delete('/:id', authMiddleware, doctorController.deleteDoctor);

router.post('/set-password', doctorController.setPassword);


module.exports = router;
