/**
 * Lightweight health check. No secrets, no model config, no env leakage.
 */
module.exports = (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    status: "ok",
    service: "atconiz",
    time: new Date().toISOString(),
  });
};
