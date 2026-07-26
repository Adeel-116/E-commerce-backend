const { v2: cloudinary } = require("cloudinary");
const dotenv = require("dotenv");

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;

const uploadImageBuffer = (buffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: "products" },
            (error, result) => {
                if (error || !result) return reject(error);
                resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
};
module.exports.uploadImageBuffer = uploadImageBuffer;

// Get the optimized
const getOptimizedUrl = (url) => {
    if (!url || typeof url !== "string") return url;

    if (!url.includes("/upload/")) return url;

    const [base, path] = url.split("/upload/");

    if (path.includes("q_auto,f_auto")) return url;

    return `${base}/upload/q_auto,f_auto/${path}`;
};
module.exports.getOptimizedUrl = getOptimizedUrl;
