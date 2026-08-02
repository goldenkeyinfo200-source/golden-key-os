import { v2 as cloudinary } from 'cloudinary';

const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim();

if (cloudinaryUrl) {
  cloudinary.config({
    cloudinary_url: cloudinaryUrl,
    secure: true,
  });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function assertCloudinaryConfigured() {
  const config = cloudinary.config();

  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    const error = new Error(
      'Cloudinary созланмаган. Railway Variables ичига CLOUDINARY_URL ёки CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY ва CLOUDINARY_API_SECRET киритинг.'
    );

    error.status = 503;
    throw error;
  }
}

export function uploadBuffer(buffer, options = {}) {
  assertCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'golden-key-os/documents',
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        ...options,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

export async function deleteAsset(publicId, resourceType = 'image') {
  if (!publicId) {
    return null;
  }

  assertCloudinaryConfigured();

  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
}

export function getPublicIdFromUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') {
    return null;
  }

  try {
    const url = new URL(fileUrl);
    const uploadPart = '/upload/';
    const uploadIndex = url.pathname.indexOf(uploadPart);

    if (uploadIndex === -1) {
      return null;
    }

    let path = url.pathname.slice(uploadIndex + uploadPart.length);
    path = path.replace(/^v\d+\//, '');

    const lastDot = path.lastIndexOf('.');

    if (lastDot > path.lastIndexOf('/')) {
      path = path.slice(0, lastDot);
    }

    return decodeURIComponent(path);
  } catch {
    return null;
  }
}

export { cloudinary };
