const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

exports.validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new ApiError(400, 'Validation Error', errors.array());
    return next(error);
  }
  next();
}; 