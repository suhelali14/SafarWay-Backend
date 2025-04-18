const ApiError = require('../utils/ApiError');

// Validate tour package creation
const validateTourPackageCreation = (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      duration,
      destination,
      startDate,
      endDate,
      maxPeople,
      inclusions,
      exclusions,
      itinerary,
      images,
      agencyId
    } = req.body;

    // Name validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new ApiError(400, 'Valid package name is required');
    }

    // Description validation
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      throw new ApiError(400, 'Valid package description is required');
    }

    // Price validation
    if (!price || typeof price !== 'number' || price <= 0) {
      throw new ApiError(400, 'Valid price is required');
    }

    // Duration validation
    if (!duration || typeof duration !== 'number' || duration <= 0) {
      throw new ApiError(400, 'Valid duration in days is required');
    }

    // Destination validation
    if (!destination || typeof destination !== 'string' || destination.trim().length === 0) {
      throw new ApiError(400, 'Valid destination is required');
    }

    // Date validation
    if (!startDate || !endDate || isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
      throw new ApiError(400, 'Valid start and end dates are required');
    }

    if (new Date(startDate) >= new Date(endDate)) {
      throw new ApiError(400, 'End date must be after start date');
    }

    // Max people validation
    if (!maxPeople || typeof maxPeople !== 'number' || maxPeople <= 0) {
      throw new ApiError(400, 'Valid maximum number of people is required');
    }

    // Arrays validation
    if (!Array.isArray(inclusions)) {
      throw new ApiError(400, 'Inclusions must be an array');
    }

    if (!Array.isArray(exclusions)) {
      throw new ApiError(400, 'Exclusions must be an array');
    }

    if (!Array.isArray(itinerary)) {
      throw new ApiError(400, 'Itinerary must be an array');
    }

    if (!Array.isArray(images)) {
      throw new ApiError(400, 'Images must be an array');
    }

    // Agency ID validation
    if (!agencyId || typeof agencyId !== 'string') {
      throw new ApiError(400, 'Valid agency ID is required');
    }

    // Trim whitespace from string fields
    req.body = {
      ...req.body,
      name: name.trim(),
      description: description.trim(),
      destination: destination.trim(),
      inclusions: inclusions.map(item => item.trim()),
      exclusions: exclusions.map(item => item.trim()),
      itinerary: itinerary.map(item => ({
        ...item,
        description: item.description.trim()
      }))
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Validate tour package update
const validateTourPackageUpdate = (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      duration,
      destination,
      startDate,
      endDate,
      maxPeople,
      inclusions,
      exclusions,
      itinerary,
      images
    } = req.body;

    // Only validate fields that are provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        throw new ApiError(400, 'Package name must be a non-empty string');
      }
      req.body.name = name.trim();
    }

    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length === 0) {
        throw new ApiError(400, 'Package description must be a non-empty string');
      }
      req.body.description = description.trim();
    }

    if (price !== undefined) {
      if (typeof price !== 'number' || price <= 0) {
        throw new ApiError(400, 'Price must be a positive number');
      }
    }

    if (duration !== undefined) {
      if (typeof duration !== 'number' || duration <= 0) {
        throw new ApiError(400, 'Duration must be a positive number');
      }
    }

    if (destination !== undefined) {
      if (typeof destination !== 'string' || destination.trim().length === 0) {
        throw new ApiError(400, 'Destination must be a non-empty string');
      }
      req.body.destination = destination.trim();
    }

    if (startDate !== undefined || endDate !== undefined) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && isNaN(start.getTime())) {
        throw new ApiError(400, 'Invalid start date');
      }

      if (end && isNaN(end.getTime())) {
        throw new ApiError(400, 'Invalid end date');
      }

      if (start && end && start >= end) {
        throw new ApiError(400, 'End date must be after start date');
      }
    }

    if (maxPeople !== undefined) {
      if (typeof maxPeople !== 'number' || maxPeople <= 0) {
        throw new ApiError(400, 'Maximum number of people must be a positive number');
      }
    }

    if (inclusions !== undefined) {
      if (!Array.isArray(inclusions)) {
        throw new ApiError(400, 'Inclusions must be an array');
      }
      req.body.inclusions = inclusions.map(item => item.trim());
    }

    if (exclusions !== undefined) {
      if (!Array.isArray(exclusions)) {
        throw new ApiError(400, 'Exclusions must be an array');
      }
      req.body.exclusions = exclusions.map(item => item.trim());
    }

    if (itinerary !== undefined) {
      if (!Array.isArray(itinerary)) {
        throw new ApiError(400, 'Itinerary must be an array');
      }
      req.body.itinerary = itinerary.map(item => ({
        ...item,
        description: item.description.trim()
      }));
    }

    if (images !== undefined) {
      if (!Array.isArray(images)) {
        throw new ApiError(400, 'Images must be an array');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateTourPackageCreation,
  validateTourPackageUpdate
}; 