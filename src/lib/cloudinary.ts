import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary environment variables are not configured. " +
        "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  return cloudinary;
}

interface UploadedImage {
  url: string;
  publicId: string;
}

export async function uploadImage(
  fileBuffer: Buffer,
  folder = "whyte/products"
): Promise<UploadedImage> {
  const client = getCloudinaryConfig();
  return new Promise((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Failed to upload image"));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    Readable.from(fileBuffer).pipe(uploadStream);
  });
}

export async function deleteImage(publicId: string) {
  const client = getCloudinaryConfig();
  return client.uploader.destroy(publicId, { resource_type: "image" });
}
