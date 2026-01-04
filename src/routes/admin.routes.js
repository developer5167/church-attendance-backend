const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const auth = require('../middlewares/auth.middleware');


router.post('/login', adminController.login);
router.post('/event', auth, adminController.createEvent);
router.post('/service', auth, adminController.createService);
router.get('/church/payment-link', auth, adminController.getPaymentLink);
router.post('/church/payment-link', auth, adminController.setPaymentLink);
router.get('/events', auth, adminController.listEvents);
router.get('/events/by-date', auth, adminController.listEventsByDate);
router.get('/services/:eventId', auth, adminController.listServices);
router.get('/attendance/service/:serviceId', auth, adminController.attendanceByService);
router.get('/attendance/event/:eventId', auth, adminController.attendanceByEvent);
router.get('/attendance/export/:eventId', auth, adminController.exportAttendanceCSV);
router.delete('/event/:eventId', auth, adminController.deleteEvent);
module.exports = router;
