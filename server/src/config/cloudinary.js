const cloudinary = require("cloudinary").v2;

const isCloudinaryConfigured = () => {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || "").trim();

  return (
    cloudName &&
    apiKey &&
    apiSecret &&
    !cloudName.startsWith("your_") &&
    !apiKey.startsWith("your_") &&
    !apiSecret.startsWith("your_")
  );
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload buffer to cloudinary
const uploadToCloudinary = (fileBuffer, folder = "ecommerce") => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      return reject(new Error("Cloudinary chưa được cấu hình đầy đủ."));
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) {
          return reject(
            new Error(`Upload Cloudinary thất bại: ${error.message || error}`),
          );
        }
        resolve(result.secure_url);
      },
    );
    stream.end(fileBuffer);
  });
};

module.exports = { cloudinary, isCloudinaryConfigured, uploadToCloudinary };
