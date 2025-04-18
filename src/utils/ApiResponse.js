class ApiResponse {
  constructor(statusCode, message = 'Success', data = null) {
    this.statusCode = statusCode;
    this.success = statusCode >= 200 && statusCode < 300;
    this.message = message;
    this.data = data;
  }

  static success(data = null, message = 'Success', statusCode = 200) {
    return new ApiResponse(statusCode, message, data);
  }

  static error(message = 'Error', statusCode = 500, data = null) {
    return new ApiResponse(statusCode, message, data);
  }

  static created(data = null, message = 'Created successfully') {
    return new ApiResponse(201, message, data);
  }

  static notFound(message = 'Resource not found') {
    return new ApiResponse(404, message);
  }

  static badRequest(message = 'Bad request') {
    return new ApiResponse(400, message);
  }

  static unauthorized(message = 'Unauthorized access') {
    return new ApiResponse(401, message);
  }

  static forbidden(message = 'Forbidden access') {
    return new ApiResponse(403, message);
  }

  static validationError(errors) {
    return new ApiResponse(422, 'Validation failed', errors);
  }
}

module.exports = ApiResponse; 