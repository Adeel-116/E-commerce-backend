const Marketing = require("../models/MarketingModel");

const getMarketingCost = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};
    if (startDate && endDate) {
      query = {
        $or: [
          {
            startDate: { $lte: new Date(endDate) },
            endDate: { $gte: new Date(startDate) },
          }, // If campaign overlaps the period
        ],
      };
    }
    const campaigns = await Marketing.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createCampaign = async (req, res) => {
  try {
    const campaign = new Marketing(req.body);
    await campaign.save();
    res.status(201).json({ success: true, campaign });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await Marketing.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });
    }
    res.status(200).json({ success: true, campaign });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await Marketing.findByIdAndDelete(id);
    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });
    }
    res.status(200).json({ success: true, message: "Campaign deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMarketingCost,
  createCampaign,
  updateCampaign,
  deleteCampaign,
};
