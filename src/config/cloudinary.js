import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload buffer to Cloudinary
export const uploadToCloudinary = async (buffer, originalname, folder, entityType) => {
  try {
    return await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `afrodoctor/${folder}`,
          public_id: `${entityType}-${Date.now()}-${originalname.split('.')[0]}`,
          resource_type: 'image',
          allowed_formats: ['jpg', 'png', 'gif'],
          fetch_format: 'auto',
          quality: 'auto',
          transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'auto' }],
        },
        (error, result) => {
          if (error) reject(new Error(`Cloudinary upload failed: ${error.message}`));
          else resolve(result.secure_url);
        }
      );
      uploadStream.end(buffer);
    });
  } catch (err) {
    throw new Error(`Cloudinary upload failed: ${err.message}`);
  }
};