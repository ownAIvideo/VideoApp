// Abstracție peste furnizorul de generare video. Schimbi furnizorul din VIDEO_PROVIDER.
export type GenInput = {
  prompt: string;
  negativePrompt: string;
  seconds: number;
  hd: boolean;
  faceImages: string[]; // data URL-uri; [0] = utilizatorul, [1] = partenerul (doar cu consimțământ activ)
};
export type JobState = { status: "processing" | "succeeded" | "failed"; outputUrl?: string; error?: string };

interface Provider {
  start(input: GenInput): Promise<string>;
  check(jobId: string): Promise<JobState>;
}

// ——— Mock: pentru dezvoltare, fără costuri. Returnează un clip CC0 după ~8 secunde.
const mock: Provider = {
  async start() { return `mock_${Date.now()}`; },
  async check(jobId) {
    const started = Number(jobId.split("_")[1]);
    if (Date.now() - started < 8000) return { status: "processing" };
    return { status: "succeeded", outputUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" };
  },
};

// ——— Replicate: orice model image-to-video. Numele câmpurilor de input diferă între modele —
// ajustează mapInput() după documentația modelului ales în REPLICATE_MODEL.
function mapInput(i: GenInput): Record<string, unknown> {
  const base: Record<string, unknown> = {
    prompt: i.prompt,
    negative_prompt: i.negativePrompt,
    duration: i.seconds,
    resolution: i.hd ? "1080p" : "720p",
    image: i.faceImages[0],
  };
  if (i.faceImages.length > 1) base.reference_images = i.faceImages;
  return base;
}

const replicate: Provider = {
  async start(input) {
    const model = process.env.REPLICATE_MODEL;
    const token = process.env.REPLICATE_API_TOKEN;
    if (!model || !token) throw new Error("REPLICATE_MODEL / REPLICATE_API_TOKEN lipsesc");
    const r = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: mapInput(input) }),
    });
    if (!r.ok) throw new Error(`Replicate: ${r.status} ${await r.text()}`);
    return (await r.json()).id as string;
  },
  async check(jobId) {
    const r = await fetch(`https://api.replicate.com/v1/predictions/${jobId}`, {
      headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` },
    });
    if (!r.ok) return { status: "failed", error: `Replicate: ${r.status}` };
    const p = await r.json();
    if (p.status === "succeeded") return { status: "succeeded", outputUrl: Array.isArray(p.output) ? p.output[0] : p.output };
    if (p.status === "failed" || p.status === "canceled") return { status: "failed", error: p.error ?? p.status };
    return { status: "processing" };
  },
};

export const videoProvider: Provider = process.env.VIDEO_PROVIDER === "replicate" ? replicate : mock;
