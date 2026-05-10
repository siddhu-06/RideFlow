const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const userController = require('../controllers/user.controller');
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
    handleValidation,
    userController.register
);

router.post('/login',
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    handleValidation,
    userController.login
);

router.get('/logout', userController.logout);
router.get('/profile', authMiddleware.userAuth, userController.profile);
router.get('/accepted-ride', authMiddleware.userAuth, userController.acceptedRide);
router.post('/internal/ride-accepted', userController.internalRideAccepted);

module.exports = router;
