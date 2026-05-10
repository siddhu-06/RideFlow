const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth.middleware');
const rideController = require('../controller/ride.controller');

function handleValidation(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}

router.post('/create-ride',
    authMiddleware.userAuth,
    body('pickup').isString().isLength({ min: 3 }).withMessage('Invalid pickup address'),
    body('destination').isString().isLength({ min: 3 }).withMessage('Invalid destination address'),
    body('vehicleType').optional().isIn([ 'auto', 'car', 'moto' ]).withMessage('Invalid vehicle type'),
    body('fare').optional().isNumeric().withMessage('Fare must be numeric'),
    handleValidation,
    rideController.createRide
);

router.put('/accept-ride',
    authMiddleware.captainAuth,
    body().custom((value, { req }) => Boolean(req.body.rideId || req.query.rideId)).withMessage('rideId is required'),
    query('rideId').optional().isMongoId().withMessage('Invalid ride id'),
    body('rideId').optional().isMongoId().withMessage('Invalid ride id'),
    handleValidation,
    rideController.acceptRide
);

module.exports = router;
