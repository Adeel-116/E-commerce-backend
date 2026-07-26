const ContactUsService = require("../services/contactUs.service");

const createContactUs = async (req, res) => {
  const contactUs = await ContactUsService.createContactUs(req.body);
  res.status(201).json({ success: true, message: "Contact us submitted successfully", data: contactUs });
};

const getContactUsById = async (req, res) => {
  const contactUs = await ContactUsService.getContactUsById(req.query.id);
  res.status(200).json({ success: true, data: contactUs });
};

const getAllContactUs = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const result = await ContactUsService.getAllContactUs(page, limit);
  res.status(200).json({ success: true, ...result });
};

const deleteContactUs = async (req, res) => {
  await ContactUsService.deleteContactUs(req.query.id);
  res.status(200).json({ success: true, message: "Contact us entry deleted successfully" });
};

module.exports = {
  createContactUs,
  getContactUsById,
  getAllContactUs,
  deleteContactUs,
};
