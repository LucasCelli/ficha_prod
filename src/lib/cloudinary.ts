import crypto from "node:crypto";

const DEFAULT_UPLOAD_PRESET = "fichas_upload";
const DEFAULT_FOLDER = "fichas";
const DEFAULT_TRANSFORMATION = "c_limit,w_1500,h_1500,q_auto:good";

export type CloudinaryPublicConfig = {
  apiKey: string;
  cloudName: string;
  uploadPreset: string;
};

export function getCloudinaryConfig() {
  return {
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET ?? DEFAULT_UPLOAD_PRESET,
  };
}

export function getCloudinaryPublicConfig(): CloudinaryPublicConfig {
  const config = getCloudinaryConfig();

  return {
    apiKey: config.apiKey,
    cloudName: config.cloudName,
    uploadPreset: config.uploadPreset,
  };
}

export function isCloudinaryConfigured() {
  const config = getCloudinaryConfig();
  return Boolean(config.apiKey && config.apiSecret && config.cloudName);
}

export function getCloudinaryUploadDefaults() {
  return {
    folder: DEFAULT_FOLDER,
    transformation: DEFAULT_TRANSFORMATION,
  };
}

export function generateCloudinarySignature(paramsToSign: Record<string, string | number | undefined>) {
  const config = getCloudinaryConfig();
  const sortedParams = Object.entries(paramsToSign)
    .filter(([, value]) => value !== undefined && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto.createHash("sha1").update(`${sortedParams}${config.apiSecret}`).digest("hex");
}
