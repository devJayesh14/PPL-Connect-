/**
 * Shared client-side utilities for normalizing and compressing player photos.
 */

const BLOCKED_STOCK_PATTERNS = [
  'images.unsplash.com/photo-1534528741775-53994a69daeb',
  'images.unsplash.com/photo-1506794778202-cad84cf45f1d',
];

/**
 * Normalizes a stored player photo string into a browser-renderable src,
 * or returns null when missing, broken, or unsupported (e.g. raw HEIC).
 */
export function normalizePlayerPhotoSrc(photo?: string | null): string | null {
  if (!photo || typeof photo !== 'string') return null;

  const trimmed = photo.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('data:image/heic') || lower.startsWith('data:image/heif')) {
    return null;
  }

  // Strip accidental whitespace/newlines inside base64 data URIs
  if (lower.startsWith('data:image/')) {
    const compact = trimmed.replace(/\s+/g, '');
    const parts = compact.split(';base64,');
    if (parts.length !== 2 || parts[1].length < 24) return null;
    return compact;
  }

  // Handle raw base64 saved without a data URI prefix
  if (trimmed.startsWith('/9j/') && trimmed.length > 50) {
    return `data:image/jpeg;base64,${trimmed.replace(/\s+/g, '')}`;
  }
  if (trimmed.startsWith('iVBOR') && trimmed.length > 50) {
    return `data:image/png;base64,${trimmed.replace(/\s+/g, '')}`;
  }
  if (trimmed.startsWith('UklGR') && trimmed.length > 50) {
    return `data:image/webp;base64,${trimmed.replace(/\s+/g, '')}`;
  }

  // Skip legacy hardcoded dummy stock URLs
  if (BLOCKED_STOCK_PATTERNS.some((pattern) => lower.includes(pattern))) {
    return null;
  }

  if (lower.startsWith('http://') || lower.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed;
  }

  return null;
}

/**
 * Compresses and converts a user-selected image File into a lightweight JPEG data URI.
 * Rejects unrenderable formats (like HEIC on non-Apple browsers) instead of storing broken bytes.
 */
export function compressPlayerImage(
  file: File,
  options: { maxDim?: number; quality?: number } = {}
): Promise<string> {
  const maxDim = options.maxDim ?? 400;
  const quality = options.quality ?? 0.8;
  const MAX_SIZE_BYTES = 20 * 1024 * 1024;

  return new Promise((resolve, reject) => {
    if (file.size > MAX_SIZE_BYTES) {
      reject(
        new Error(
          `Image size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 20MB limit. Please choose a smaller photo.`
        )
      );
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isHeic =
      file.type.toLowerCase().includes('heic') ||
      file.type.toLowerCase().includes('heif') ||
      lowerName.endsWith('.heic') ||
      lowerName.endsWith('.heif');

    if (!file.type.startsWith('image/') && !isHeic) {
      reject(new Error('Please select a valid image file (JPEG, PNG, WEBP).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result;
      if (typeof dataUrl !== 'string') {
        reject(new Error('Failed to read image file.'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (!width || !height) {
            reject(new Error('Selected image has invalid dimensions. Please pick another photo.'));
            return;
          }

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not process image in this browser. Please try another JPEG or PNG photo.'));
            return;
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          let compressed = canvas.toDataURL('image/jpeg', quality);
          if (compressed.length > 250_000) {
            compressed = canvas.toDataURL('image/jpeg', 0.65);
          }

          if (!compressed.startsWith('data:image/')) {
            reject(new Error('Failed to encode photo. Please use a JPEG or PNG image.'));
            return;
          }

          resolve(compressed);
        } catch {
          reject(new Error('Could not process this photo. Please try a JPEG or PNG image.'));
        }
      };

      img.onerror = () => {
        reject(
          new Error(
            'This image format is not supported by your browser (e.g., iPhone HEIC). Please upload a JPEG, PNG, or WEBP photo.'
          )
        );
      };

      img.src = dataUrl;
    };

    reader.onerror = () => reject(new Error('Failed to read the selected image file.'));
    reader.readAsDataURL(file);
  });
}
