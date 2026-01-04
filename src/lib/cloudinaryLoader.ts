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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/2e745d89-c8fd-4a90-8147-0602bacdba14',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H1',location:'cloudinaryLoader.ts:entry',message:'loader entry',data:{src,width,quality},timestamp:Date.now()})
  }).catch(()=>{});
  // #endregion
  // If src is not an absolute URL, just return as-is (let it be served statically)
  if (!/^https?:\/\//i.test(src)) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/2e745d89-c8fd-4a90-8147-0602bacdba14',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H1',location:'cloudinaryLoader.ts:relative',message:'relative src passthrough',data:{src,width},timestamp:Date.now()})
    }).catch(()=>{});
    // #endregion
    return src;
  }

  // Only handle Cloudinary URLs
  const idx = src.indexOf(CLOUDINARY_UPLOAD_SEGMENT);
  if (idx === -1) {
    // Not a Cloudinary URL, return as-is so Next/Image uses it directly
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/2e745d89-c8fd-4a90-8147-0602bacdba14',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'cloudinaryLoader.ts:non-cloudinary',message:'non-cloudinary passthrough',data:{src,width},timestamp:Date.now()})
    }).catch(()=>{});
    // #endregion
    return src;
  }

  const before = src.slice(0, idx + CLOUDINARY_UPLOAD_SEGMENT.length);
  const after = src.slice(idx + CLOUDINARY_UPLOAD_SEGMENT.length);

  // If there are already transformations (e.g. starts with f_ / q_ / w_), leave as-is
  if (/^(?:c_|f_|q_|w_)/.test(after)) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/2e745d89-c8fd-4a90-8147-0602bacdba14',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H3',location:'cloudinaryLoader.ts:already-transformed',message:'transform exists, passthrough',data:{srcAfter:after.slice(0,30),width},timestamp:Date.now()})
    }).catch(()=>{});
    // #endregion
    return src;
  }

  const q = typeof quality === 'number' ? quality : 75;
  const transform = `f_auto,q_${q},w_${width}`;
  const out = `${before}${encodeURIComponent(transform)}/${after}`;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/2e745d89-c8fd-4a90-8147-0602bacdba14',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H1',location:'cloudinaryLoader.ts:exit',message:'loader exit',data:{out,width},timestamp:Date.now()})
  }).catch(()=>{});
  // #endregion
  return out;
}


