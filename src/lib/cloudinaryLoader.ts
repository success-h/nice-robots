// Custom Next.js image loader for Cloudinary that appends f_auto,q_,w_ transforms
// and returns a direct Cloudinary URL (avoids Next.js /_next/image proxy).
//
// This keeps Next/Image responsive behaviour (via deviceSizes/imageSizes)
// while delegating the actual resizing/format negotiation to Cloudinary.
//
// It also guards against double‑inserting transformations if the source URL
// already contains a transformation segment.

type LoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

const CLOUDINARY_UPLOAD_SEGMENT = '/image/upload/';

export default function cloudinaryLoader({ src, width, quality }: LoaderProps): string {
  // If src is not an absolute URL, just return as-is (let it be served statically)
  if (!/^https?:\/\//i.test(src)) {
    return src;
  }

  // Only handle Cloudinary URLs
  const idx = src.indexOf(CLOUDINARY_UPLOAD_SEGMENT);
  if (idx === -1) {
    // Not a Cloudinary URL, return as-is so Next/Image uses it directly
    return src;
  }

  const before = src.slice(0, idx + CLOUDINARY_UPLOAD_SEGMENT.length);
  const after = src.slice(idx + CLOUDINARY_UPLOAD_SEGMENT.length);

  // If there are already transformations (e.g. starts with f_ / q_ / w_), leave as-is
  if (/^(?:c_|f_|q_|w_)/.test(after)) {
    return src;
  }

  const q = typeof quality === 'number' ? quality : 75;
  const transform = `f_auto,q_${q},w_${width}`;
  const out = `${before}${encodeURIComponent(transform)}/${after}`;
  return out;
}


