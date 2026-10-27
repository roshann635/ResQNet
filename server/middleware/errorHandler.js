/**
 * Global API Error Handling Middleware.
 * Provides uniform JSON error formatting across all endpoints.
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const errorResponse = {
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.stack = err.stack;
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Data Validation Error',
      code: 'VALIDATION_FAILED',
      details: Object.values(err.errors).map((e) => e.message)
    });
  }

  // MongoDB connection lost
  if (err.name === 'MongooseError' || err.name === 'MongoServerSelectionError') {
    return res.status(503).json({
      error: 'Database Unavailable: Action failed due to database connectivity error',
      code: 'DB_UNAVAILABLE'
    });
  }

  res.status(statusCode).json(errorResponse);
}

export default errorHandler;
