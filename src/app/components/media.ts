// Client-side media helpers: compress images and sample frames from video.

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function downscaleImage(dataUrl: string, max = 1200, quality = 0.72): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function extractVideoFrames(file: File, count = 4, max = 1100, quality = 0.65): Promise<string[]> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    const frames: string[] = [];
    const finish = () => { URL.revokeObjectURL(url); resolve(frames); };
    const seek = (t: number) =>
      new Promise<void>((res) => {
        const handler = () => { video.removeEventListener("seeked", handler); res(); };
        video.addEventListener("seeked", handler);
        try { video.currentTime = t; } catch { res(); }
      });
    video.onloadedmetadata = async () => {
      const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      const times = dur ? Array.from({ length: count }, (_, i) => (dur * (i + 0.5)) / count) : [0];
      const canvas = document.createElement("canvas");
      for (const t of times) {
        await seek(t);
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        const scale = Math.min(1, max / Math.max(w, h));
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg", quality));
      }
      finish();
    };
    video.onerror = () => finish();
    video.src = url;
  });
}
