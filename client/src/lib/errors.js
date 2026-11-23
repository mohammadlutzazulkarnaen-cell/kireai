/**
 * Shared API error type. Kept in its own module so both the HTTP client and the
 * browser backend can use it without a circular import.
 */
export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
