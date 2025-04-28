const { cacheHelpers } = require('./cache.middleware');

/**
 * Middleware to automatically invalidate package cache after successful operations
 * Apply this middleware to any routes that modify package data
 */
const clearPackageCacheMiddleware = async (req, res, next) => {
  // Store the original end function
  const originalEnd = res.end;
  
  // Override the end function
  res.end = async function(chunk, encoding) {
    // Only clear cache for successful requests (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const packageId = req.params.id || req.params.packageId;
        const agencyId = req.user?.agencyId;
        
        console.log(`Automatically clearing cache for operation on package ${packageId || 'all'}`);
        
        // Clear specific package cache if packageId provided, otherwise clear all package cache
        if (packageId) {
          await cacheHelpers.clearPackageCache(packageId);
        } else {
          await cacheHelpers.clearPackageCache();
        }
        
        // If this might affect agency stats/data, also clear agency cache
        if (agencyId) {
          await cacheHelpers.clearAgencyCache(agencyId);
        }
        
        // Add a header to indicate cache was cleared
        res.setHeader('X-Cache-Cleared', 'true');
        
      } catch (error) {
        console.error('Error clearing package cache automatically:', error);
        // Don't block the response if cache clearing fails
      }
    }
    
    // Call the original end function
    return originalEnd.call(this, chunk, encoding);
  };
  
  // Continue to the next middleware/controller
  next();
};

module.exports = {
  clearPackageCacheMiddleware
}; 