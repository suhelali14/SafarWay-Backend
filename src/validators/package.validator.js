const ApiError = require('../utils/ApiError');

// Validate package creation
const validatePackageCreation = (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      duration,
      destination,
      inclusions,
      exclusions,
      itinerary,
      maxPeople,
      startDate,
      endDate
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
      throw new ApiError(400, 'Valid package price is required');
    }

    // Duration validation
    if (!duration || typeof duration !== 'number' || duration <= 0) {
      throw new ApiError(400, 'Valid package duration is required');
    }

    // Destination validation
    if (!destination || typeof destination !== 'string' || destination.trim().length === 0) {
      throw new ApiError(400, 'Valid destination is required');
    }

    // Inclusions validation
    if (!Array.isArray(inclusions) || inclusions.length === 0) {
      throw new ApiError(400, 'At least one inclusion is required');
    }

    // Exclusions validation
    if (!Array.isArray(exclusions)) {
      throw new ApiError(400, 'Exclusions must be an array');
    }

    // Itinerary validation
    if (!Array.isArray(itinerary) || itinerary.length === 0) {
      throw new ApiError(400, 'At least one itinerary item is required');
    }

    // Max people validation
    if (!maxPeople || typeof maxPeople !== 'number' || maxPeople <= 0) {
      throw new ApiError(400, 'Valid maximum number of people is required');
    }

    // Date validation
    if (!startDate || isNaN(Date.parse(startDate))) {
      throw new ApiError(400, 'Valid start date is required');
    }

    if (!endDate || isNaN(Date.parse(endDate))) {
      throw new ApiError(400, 'Valid end date is required');
    }

    if (new Date(startDate) >= new Date(endDate)) {
      throw new ApiError(400, 'End date must be after start date');
    }

    // Trim whitespace from string fields
    req.body.name = name.trim();
    req.body.description = description.trim();
    req.body.destination = destination.trim();

    next();
  } catch (error) {
    next(error);
  }
};

// Validate package update
const validatePackageUpdate = (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      duration,
      destination,
      inclusions,
      exclusions,
      itinerary,
      maxPeople,
      startDate,
      endDate
    } = req.body;

    // Name validation (if provided)
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        throw new ApiError(400, 'Valid package name is required');
      }
      req.body.name = name.trim();
    }

    // Description validation (if provided)
    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length === 0) {
        throw new ApiError(400, 'Valid package description is required');
      }
      req.body.description = description.trim();
    }

    // Price validation (if provided)
    if (price !== undefined) {
      if (typeof price !== 'number' || price <= 0) {
        throw new ApiError(400, 'Valid package price is required');
      }
    }

    // Duration validation (if provided)
    if (duration !== undefined) {
      if (typeof duration !== 'number' || duration <= 0) {
        throw new ApiError(400, 'Valid package duration is required');
      }
    }

    // Destination validation (if provided)
    if (destination !== undefined) {
      if (typeof destination !== 'string' || destination.trim().length === 0) {
        throw new ApiError(400, 'Valid destination is required');
      }
      req.body.destination = destination.trim();
    }

    // Inclusions validation (if provided)
    if (inclusions !== undefined) {
      if (!Array.isArray(inclusions) || inclusions.length === 0) {
        throw new ApiError(400, 'At least one inclusion is required');
      }
    }

    // Exclusions validation (if provided)
    if (exclusions !== undefined) {
      if (!Array.isArray(exclusions)) {
        throw new ApiError(400, 'Exclusions must be an array');
      }
    }

    // Itinerary validation (if provided)
    if (itinerary !== undefined) {
      if (!Array.isArray(itinerary) || itinerary.length === 0) {
        throw new ApiError(400, 'At least one itinerary item is required');
      }
    }

    // Max people validation (if provided)
    if (maxPeople !== undefined) {
      if (typeof maxPeople !== 'number' || maxPeople <= 0) {
        throw new ApiError(400, 'Valid maximum number of people is required');
      }
    }

    // Date validation (if provided)
    if (startDate !== undefined) {
      if (isNaN(Date.parse(startDate))) {
        throw new ApiError(400, 'Valid start date is required');
      }
    }

    if (endDate !== undefined) {
      if (isNaN(Date.parse(endDate))) {
        throw new ApiError(400, 'Valid end date is required');
      }
    }

    if (startDate !== undefined && endDate !== undefined) {
      if (new Date(startDate) >= new Date(endDate)) {
        throw new ApiError(400, 'End date must be after start date');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validatePackageCreation,
  validatePackageUpdate
}; 