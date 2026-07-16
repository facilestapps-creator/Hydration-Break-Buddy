// Augment Express Request to carry the authenticated userId
// set by the requireAuth middleware.
declare namespace Express {
  interface Request {
    userId: number;
  }
}
