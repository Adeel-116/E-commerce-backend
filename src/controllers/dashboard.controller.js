const DashboardService = require("../services/dashboard.service");

const getDashboardStats = async (req, res) => {
  const periodParam = req.query.period || "30d";
  const result = await DashboardService.getDashboardStats(periodParam);
  res.status(200).json({ success: true, ...result });
};

module.exports = { getDashboardStats };
