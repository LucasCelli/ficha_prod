export function getCloudinaryTransformedImageUrl(value: string | null | undefined, width: number, height: number, quality = "auto:eco") {
  if (!value || !value.includes("res.cloudinary.com") || !value.includes("/image/upload/")) {
    return value ?? "";
  }

  return value.replace("/image/upload/", `/image/upload/c_fill,w_${width},h_${height},f_auto,q_${quality}/`);
}
