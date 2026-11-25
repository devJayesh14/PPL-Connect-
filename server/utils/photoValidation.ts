const STOCK_PLACEHOLDERS = [
  'images.unsplash.com/photo-1534528741775-53994a69daeb',
  'images.unsplash.com/photo-1506794778202-cad84cf45f1d',
];

export function sanitizePlayerPhoto(rawPhoto: unknown): { ok: boolean; photo: string; error?: string } {
  if (typeof rawPhoto !== 'string') {
    return { ok: true, photo: '' };
  }

  const trimmed = rawPhoto.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
    return { ok: true, photo: '' };
  }

  const lower = trimmed.toLowerCase();

  if (lower.startsWith('data:image/heic') || lower.startsWith('data:image/heif')) {
    return {
      ok: false,
      photo: '',
      error: 'HEIC/HEIF photos cannot render on all browsers. Please upload a JPEG, PNG, or WEBP image.',
    };
  }

  if (STOCK_PLACEHOLDERS.some((pattern) => lower.includes(pattern))) {
    return { ok: true, photo: '' };
  }

  if (trimmed.length > 1_500_000) {
    return {
      ok: false,
      photo: '',
      error: 'Photo file is too large. Please upload a compressed image under 1MB.',
    };
  }

  if (lower.startsWith('data:image/')) {
    const compact = trimmed.replace(/\s+/g, '');
    const parts = compact.split(';base64,');
    if (parts.length !== 2 || parts[1].length < 24) {
      return { ok: false, photo: '', error: 'Invalid image data. Please select another JPEG or PNG photo.' };
    }
    return { ok: true, photo: compact };
  }

  if (trimmed.startsWith('/9j/') && trimmed.length > 50) {
    return { ok: true, photo: `data:image/jpeg;base64,${trimmed.replace(/\s+/g, '')}` };
  }
  if (trimmed.startsWith('iVBOR') && trimmed.length > 50) {
    return { ok: true, photo: `data:image/png;base64,${trimmed.replace(/\s+/g, '')}` };
  }
  if (trimmed.startsWith('UklGR') && trimmed.length > 50) {
    return { ok: true, photo: `data:image/webp;base64,${trimmed.replace(/\s+/g, '')}` };
  }

  if (lower.startsWith('http://') || lower.startsWith('https://') || trimmed.startsWith('/')) {
    return { ok: true, photo: trimmed };
  }

  return { ok: false, photo: '', error: 'Unsupported photo format. Please upload a JPEG, PNG, or WEBP image.' };
}

export function isDisplayablePhoto(photo?: string | null): boolean {
  const res = sanitizePlayerPhoto(photo);
  return res.ok && res.photo.length > 20;
}
