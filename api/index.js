// Vercel serverless entrypoint.
// Vercel builds/routes to this file (see vercel.json). It simply re-exports
// the configured Express app from server.js — Vercel wraps it as a handler.
module.exports = require("../server.js");
