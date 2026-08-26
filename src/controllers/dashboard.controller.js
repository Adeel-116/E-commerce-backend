const DashboardService = require("../services/dashboard.service");

const getDashboardStats = async (req, res) => {
  const periodParam = req.query.period;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const result = await DashboardService.getDashboardStats(
    periodParam,
    startDate,
    endDate,
  );
  res.status(200).json({ success: true, ...result });
};

module.exports = { getDashboardStats };
