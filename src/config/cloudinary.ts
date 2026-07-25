import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export default cloudinary;

export const uploadImageBuffer = (buffer: Buffer): Promise<string> => {
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

// Get the optimized
export const getOptimizedUrl = (url: any): string => {
    if (!url || typeof url !== "string") return url;

    if (!url.includes("/upload/")) return url;

    const [base, path] = url.split("/upload/");

    if (path.includes("q_auto,f_auto")) return url;

    return `${base}/upload/q_auto,f_auto/${path}`;
};
