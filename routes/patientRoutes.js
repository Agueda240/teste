// routes/patientRoutes.js
const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const authMiddleware = require('../middleware/authMiddleware');

// Rotas para gerenciamento de pacientes
router.post('/', authMiddleware, patientController.createPatient);
router.get('/', authMiddleware, patientController.getAllPatients);
router.get('/medications', authMiddleware, patientController.getAllMedications);

router.get('/surgeryTypes', authMiddleware, patientController.getAllSurgeryTypes);

router.get('/:id', authMiddleware, patientController.getPatientById);
router.put('/:id', authMiddleware, patientController.updatePatient);
router.delete('/:id', authMiddleware, patientController.deletePatient);

// Arquivar paciente
router.patch('/patients/:id/estado', authMiddleware, patientController.updateEstado);

// Reativar paciente
router.patch('/:id/ativar', authMiddleware, patientController.activatePatient);

// Enviar formulário manualmente
router.post('/:patientId/send-form/:formId', authMiddleware, patientController.sendFormToPatient);



module.exports = router;
