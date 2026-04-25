import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(status, message, code = "API_ERROR", details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: "Not Found",
    code: "NOT_FOUND",
    path: req.originalUrl,
  });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Invalid request body",
      code: "VALIDATION_ERROR",
      details: err.issues,
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
  }

  return res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
  });
}
