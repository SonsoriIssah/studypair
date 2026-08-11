// Resizes an image file to a small square JPEG and returns it as a data
// URL, entirely client-side — the backend stores whatever we send it inline
// (see AvatarUpdateRequest), so keeping the upload small here is what keeps
// the stored row small.
const MAX_DIMENSION = 256;
const JPEG_QUALITY = 0.8;

export async function resizeImageToDataUrl(file: File): Promise<string> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image.");
    ctx.drawImage(bitmap, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}
