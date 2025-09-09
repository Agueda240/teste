// routes/patientRoutes.js
const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const authMiddleware = require('../middleware/authMiddleware');

// CRUD / utilitários
router.post('/', authMiddleware, patientController.createPatient);
router.get('/', authMiddleware, patientController.getAllPatients);
router.get('/medications', authMiddleware, patientController.getAllMedications);
router.get('/surgeryTypes', authMiddleware, patientController.getAllSurgeryTypes);
router.get('/:id', authMiddleware, patientController.getPatientById);
router.put('/:id', authMiddleware, patientController.updatePatient);
router.delete('/:id', authMiddleware, patientController.deletePatient);

// Estado do paciente (genérico: 'ativo' | 'arquivado')
router.patch('/:id/estado', authMiddleware, patientController.updateEstado);

// (Opcional, se mantiveres compat): reativar específico
router.patch('/:id/ativar', authMiddleware, patientController.activatePatient);

router.post(
  '/:patientId/remind-manual-all',
  authMiddleware,
  patientController.remindManualAll
);

// Enviar formulário manualmente
router.post('/:patientId/send-form/:formId', authMiddleware, patientController.sendFormToPatient);

module.exports = router;