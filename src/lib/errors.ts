// Typed errors thrown by the service layer. The API layer maps them to HTTP
// status codes in one place (src/lib/api.ts) — services never know about HTTP,
// which is what lets them move into a standalone service later untouched.

export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthError extends AppError {
  constructor(message = "Not signed in") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You can't do that") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many attempts. Try again later.") {
    super(message, 429);
  }
}
