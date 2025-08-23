const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/followUpController');
const auth    = require('../middleware/authMiddleware');

// Middleware para carregar automaticamente o followUp
router.param('followUpId', async (req, res, next, followUpId) => {
  try {
    const followUp = await ctrl.getFollowUpDocumentById(followUpId);
    if (!followUp) return res.status(404).json({ message: 'Acompanhamento não encontrado.' });
    req.followUp = followUp;
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao carregar acompanhamento.', error: err.message });
  }
});


router.get('/', auth, ctrl.getAllFollowUpsGlobal);

router.get('/surgery-types', auth, ctrl.getAllSurgeryTypes);

// lookup público por slug
router.get('/by-slug/:slug', ctrl.getBySlug);
router.get('/verify/:patientId/:followUpId/:questionnaireId', ctrl.verifyQuestionnaire);
router.post('/:patientId/:followUpId/:questionnaireId/submit-form', ctrl.submitQuestionnaire);
router.get('/questionnaires/critical', ctrl.getCritical);
router.patch('/:patientId/:followUpId/questionnaires/:questionnaireId/verify', auth, ctrl.markQuestionnaireVerified);

// CRUD protegido
router.post('/:patientId',                       auth, ctrl.createFollowUp);
router.get('/:patientId',                        auth, ctrl.getAllFollowUps);
router.get('/:patientId/:followUpId',            auth, ctrl.getFollowUpById);
router.put('/:patientId/:followUpId',            auth, ctrl.updateFollowUp);
router.delete('/:patientId/:followUpId',         auth, ctrl.deleteFollowUp);

// questionários aninhados
router.post('/:patientId/:followUpId/questionnaires',         auth, ctrl.addQuestionnaire);
router.get('/:patientId/:followUpId/questionnaires',          auth, ctrl.getAllQuestionnaires);
router.put('/:patientId/:followUpId/questionnaires/:id',      auth, ctrl.updateQuestionnaire);
router.delete('/:patientId/:followUpId/questionnaires/:id',   auth, ctrl.deleteQuestionnaire);

// enviar/manual/reminder
router.post('/:patientId/:followUpId/send-form/:formId',      auth, ctrl.sendFormToPatient);



module.exports = router;
