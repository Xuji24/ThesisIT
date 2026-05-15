// Vercel serverless entry point.
// Thin wrapper — imports and re-exports the Express app from server/.
// Vercel calls `app(req, res)` directly; no app.listen() is needed.
import app from '../server/index.js';

export default app;
