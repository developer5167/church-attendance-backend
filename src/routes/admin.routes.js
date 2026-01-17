const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const auth = require('../middlewares/auth.middleware');
const { adminVolunteerLimiter } = require('../middlewares/rateLimit');

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
router.get('/baptism-requests', auth, adminController.listBaptismRequests);
router.patch('/baptism-requests/:requestId/complete', auth, adminController.completeBaptism);

// Volunteer admin routes
router.get('/volunteer-requests', auth, adminVolunteerLimiter, adminController.listVolunteerRequests);
router.get('/volunteer-requests/:id', auth, adminVolunteerLimiter, adminController.getVolunteerRequestById);
router.patch('/volunteer-requests/:id', auth, adminVolunteerLimiter, adminController.updateVolunteerRequestStatus);

module.exports = router;
