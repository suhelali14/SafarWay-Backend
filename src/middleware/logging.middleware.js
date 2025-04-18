/**
 * Logging middleware for Express
 * This middleware logs detailed information about requests and responses
 */

// Logger for request and response details
const requestLogger = (req, res, next) => {
  // Generate a unique request ID
  const requestId = Math.random().toString(36).substring(2, 15);
  
  // Log request details
  const requestLog = {
    id: requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    headers: req.headers,
    body: maskSensitiveData(req.body),
    query: req.query,
    params: req.params,
  };
  
  console.log(`📥 REQUEST [${requestId}]:`, JSON.stringify(requestLog, null, 2));

  // Track response time
  const startTime = Date.now();
  
  // Capture the original end function
  const originalEnd = res.end;
  
  // Override the end function to log response details
  res.end = function(chunk, encoding) {
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Log response details
    const responseLog = {
      id: requestId,
      timestamp: new Date().toISOString(),
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      headers: res.getHeaders(),
      responseTime: `${responseTime}ms`,
    };
    
    console.log(`📤 RESPONSE [${requestId}]:`, JSON.stringify(responseLog, null, 2));
    
    // Call the original end function
    originalEnd.apply(res, arguments);
  };
  
  next();
};

// Helper function to mask sensitive data in request body
const maskSensitiveData = (data) => {
  if (!data) return data;
  
  const maskedData = { ...data };
  
  // List of fields to mask
  const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken'];
  
  // Mask sensitive fields
  sensitiveFields.forEach(field => {
    if (maskedData[field]) {
      maskedData[field] = '********';
    }
  });
  
  return maskedData;
};

module.exports = {
  requestLogger,
}; 