const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const captainController = require('../controllers/captain.controller');
const authMiddleware = require('../middleware/authMiddleWare');

function handleValidation(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}

router.post('/register',
    body().custom(value => Boolean(value.fullname?.firstname || value.name)).withMessage('Name or fullname.firstname is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('fullname.firstname').optional().isLength({ min: 3 }).withMessage('First name must be at least 3 characters long'),
    body('name').optional().isLength({ min: 3 }).withMessage('Name must be at least 3 characters long'),
    body('vehicle.vehicleType').optional().isIn([ 'car', 'moto', 'auto' ]).withMessage('Invalid vehicle type'),
    handleValidation,
    captainController.register
);

router.post('/login',
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    handleValidation,
    captainController.login
);

router.get('/logout', captainController.logout);
router.get('/profile', authMiddleware.captainAuth, captainController.profile);
router.patch('/toggle-availability', authMiddleware.captainAuth, captainController.toggleAvailability);
router.get('/new-ride', authMiddleware.captainAuth, captainController.waitForNewRide);
router.post('/internal/new-ride', captainController.internalNewRide);

module.exports = router;
