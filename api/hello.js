module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({
    message: "Hello from Atconiz API!",
    working: true,
    time: new Date().toISOString()
  });
};
