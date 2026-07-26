const {
  createBundleService,
  getAllBundlesService,
  getBundleByIdService,
  updateBundleService,
  deleteBundleService,
} = require("../services/bundle.service");

const getParamAsString = (
  param
) => {
  if (!param) return null;
  if (Array.isArray(param)) return param[0] || null;
  return param;
};

const createBundle = async (
  req,
  res
) => {
  try {
    const bundle = await createBundleService(req.body);

    res.status(201).json({
      success: true,
      message: "Bundle created successfully",
      data: bundle,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Error creating bundle",
    });
  }
};

const getAllBundles = async (
  req,
  res
) => {
  try {
    const bundles = await getAllBundlesService();

    res.status(200).json({
      success: true,
      count: bundles.length,
      data: bundles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Error fetching bundles",
    });
  }
};

const getBundleById = async (
  req,
  res
) => {
  try {
    const id = getParamAsString(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Bundle id is required",
      });
      return;
    }

    const bundle = await getBundleByIdService(id);

    if (!bundle) {
      res.status(404).json({
        success: false,
        message: "Bundle not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: bundle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Error fetching bundle",
    });
  }
};

const updateBundle = async (
  req,
  res
) => {
  try {
    const id = getParamAsString(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Bundle id is required",
      });
      return;
    }

    const updatedBundle = await updateBundleService(id, req.body);

    if (!updatedBundle) {
      res.status(404).json({
        success: false,
        message: "Bundle not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Bundle updated successfully",
      data: updatedBundle,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Error updating bundle",
    });
  }
};

const deleteBundle = async (
  req,
  res
) => {
  try {
    const id = getParamAsString(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Bundle id is required",
      });
      return;
    }

    const deletedBundle = await deleteBundleService(id);

    if (!deletedBundle) {
      res.status(404).json({
        success: false,
        message: "Bundle not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Bundle deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Error deleting bundle",
    });
  }
};

module.exports = {
  createBundle,
  getAllBundles,
  getBundleById,
  updateBundle,
  deleteBundle,
};
