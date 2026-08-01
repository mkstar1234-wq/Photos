import { CompressionResult } from '../types';

/**
 * Converts a base64 Data URL to a Blob as a fallback.
 */
function dataURLtoBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Multi-tier image loader with fallbacks:
 * 1. URL.createObjectURL
 * 2. FileReader readAsDataURL
 * 3. createImageBitmap
 */
async function loadImageSource(file: File): Promise<HTMLImageElement | ImageBitmap> {
  if (!file || file.size === 0) {
    throw new Error('Selected file is empty or missing.');
  }

  // Strategy 1: URL.createObjectURL
  try {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (err) => reject(err);
      img.src = objectUrl;
    });
    URL.revokeObjectURL(objectUrl);
    return img;
  } catch {
    // Proceed to strategy 2
  }

  // Strategy 2: FileReader readAsDataURL
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (err) => reject(err);
      img.src = dataUrl;
    });
    return img;
  } catch {
    // Proceed to strategy 3
  }

  // Strategy 3: createImageBitmap
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return bitmap;
    } catch {
      // Proceed to error
    }
  }

  throw new Error('Unable to read or load image file. Please ensure the file is a supported photo format (JPEG, PNG, WEBP).');
}

/**
 * Heavily compresses an image using HTML5 Canvas.
 * Downscales to max resolution fit within specified bounding box (preserving aspect ratio)
 * and applies JPEG compression quality.
 */
export async function compressReceiptImage(
  file: File,
  quality: number = 0.20,
  maxWidth: number = 360,
  maxHeight: number = 360
): Promise<CompressionResult> {
  const originalSize = file.size;
  const source = await loadImageSource(file);

  const srcWidth = 'naturalWidth' in source ? source.naturalWidth || source.width : source.width;
  const srcHeight = 'naturalHeight' in source ? source.naturalHeight || source.height : source.height;

  let width = srcWidth;
  let height = srcHeight;

  // Calculate aspect ratio and target dimensions
  if (width > maxWidth || height > maxHeight) {
    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const scale = Math.min(widthRatio, heightRatio);

    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  // Ensure width & height are at least 1px
  width = Math.max(1, width);
  height = Math.max(1, height);

  // Create HTML5 Canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    if ('close' in source && typeof source.close === 'function') {
      source.close();
    }
    throw new Error('Failed to get canvas 2D context');
  }

  // Apply high quality smoothing for text readability on receipts
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw image onto canvas
  ctx.drawImage(source, 0, 0, width, height);

  // Clean up ImageBitmap if applicable
  if ('close' in source && typeof source.close === 'function') {
    source.close();
  }

  // Get data URL
  const dataUrl = canvas.toDataURL('image/jpeg', quality);

  // Get Blob (with dataURL fallback)
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (b) => {
        if (b) {
          resolve(b);
        } else {
          resolve(dataURLtoBlob(dataUrl));
        }
      },
      'image/jpeg',
      quality
    );
  });

  const compressedSize = blob.size;
  const ratio = Number((((originalSize - compressedSize) / Math.max(1, originalSize)) * 100).toFixed(1));

  return {
    blob,
    dataUrl,
    originalSize,
    compressedSize,
    width,
    height,
    ratio: Math.max(0, ratio),
  };
}

/**
 * Format bytes into human readable format (KB, MB)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

