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

// ——— fal.ai (recomandat): 2 pași.
// 1) Un model de imagine compune primul cadru 9:16 din fotografia/fotografiile de referință + scena.
// 2) Un model image-to-video animează cadrul, cu sunet și dialog sincronizat pe buze.
const FAL = "https://queue.fal.run";
const falHeaders = () => {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY lipsește");
  return { Authorization: `Key ${key}`, "Content-Type": "application/json" };
};

async function falSubmit(endpoint: string, input: Record<string, unknown>) {
  const r = await fetch(`${FAL}/${endpoint}`, { method: "POST", headers: falHeaders(), body: JSON.stringify(input) });
  const j = await r.json();
  if (!r.ok) throw new Error(`fal ${endpoint}: ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return j as { request_id: string; status_url: string; response_url: string };
}

async function falWait(job: { status_url: string; response_url: string }, maxMs = 120_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const st = await (await fetch(job.status_url, { headers: falHeaders() })).json();
    if (st.status === "COMPLETED") return (await fetch(job.response_url, { headers: falHeaders() })).json();
    if (st.status !== "IN_QUEUE" && st.status !== "IN_PROGRESS") throw new Error(`fal: ${JSON.stringify(st).slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error("fal: compunerea cadrului a durat prea mult");
}

const fal: Provider = {
  async start(input) {
    const imageModel = process.env.FAL_IMAGE_MODEL || "fal-ai/nano-banana/edit";
    const videoModel = process.env.FAL_VIDEO_MODEL || "fal-ai/veo3.1/lite/image-to-video";
    const who = input.faceImages.length > 1 ? "the two people from the reference photos (keep both faces exactly)" : "the person from the reference photo (keep the face exactly)";
    const frame = await falWait(await falSubmit(imageModel, {
      prompt: `Photorealistic vertical 9:16 film still of ${who}. Scene: ${input.prompt}. Natural skin texture, cinematic lighting, fully clothed, no text.`,
      image_urls: input.faceImages,
      aspect_ratio: "9:16",
      output_format: "jpeg",
      num_images: 1,
    }));
    const frameUrl: string | undefined = frame?.images?.[0]?.url;
    if (!frameUrl) throw new Error("fal: modelul de imagine nu a returnat un cadru");

    const job = await falSubmit(videoModel, {
      prompt: input.prompt,
      negative_prompt: input.negativePrompt,
      image_url: frameUrl,
      aspect_ratio: "9:16",
      duration: input.seconds <= 4 ? "4s" : input.seconds <= 6 ? "6s" : "8s",
      resolution: input.hd ? "1080p" : "720p",
      generate_audio: true,
      safety_tolerance: "2",
    });
    return JSON.stringify({ s: job.status_url, r: job.response_url });
  },
  async check(jobId) {
    const { s, r } = JSON.parse(jobId) as { s: string; r: string };
    const st = await (await fetch(s, { headers: falHeaders() })).json();
    if (st.status === "IN_QUEUE" || st.status === "IN_PROGRESS") return { status: "processing" };
    if (st.status !== "COMPLETED") return { status: "failed", error: JSON.stringify(st).slice(0, 300) };
    const out = await (await fetch(r, { headers: falHeaders() })).json();
    const url: string | undefined = out?.video?.url;
    return url ? { status: "succeeded", outputUrl: url } : { status: "failed", error: JSON.stringify(out).slice(0, 300) };
  },
};

const PROVIDERS: Record<string, Provider> = { mock, replicate, fal };
export const videoProvider: Provider = PROVIDERS[process.env.VIDEO_PROVIDER ?? "mock"] ?? mock;
