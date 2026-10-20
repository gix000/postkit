export type Task = { id: string; label: string; group: string };

/** Arabic names for task filters. */
export const TASK_AR: Record<string, string> = {"text-generation": "توليد نص", "image-text-to-text": "صورة ونص إلى نص", "text-classification": "تصنيف النص", "token-classification": "تصنيف الكلمات", "translation": "ترجمة", "summarization": "تلخيص", "question-answering": "أسئلة وأجوبة", "fill-mask": "إكمال الكلمات", "sentence-similarity": "تشابه الجمل", "feature-extraction": "تضمينات", "text-to-image": "نص إلى صورة", "image-to-image": "صورة إلى صورة", "image-classification": "تصنيف الصور", "object-detection": "كشف الأجسام", "image-segmentation": "تقسيم الصور", "text-to-video": "نص إلى فيديو", "automatic-speech-recognition": "تحويل الكلام إلى نص", "text-to-speech": "نص إلى كلام", "audio-classification": "تصنيف الصوت", "image-to-video": "صورة إلى فيديو"};

export const MODEL_TASKS: Task[] = [
  { id: "text-generation", label: "Text generation", group: "Language" },
  { id: "image-text-to-text", label: "Image + text to text", group: "Multimodal" },
  { id: "text-classification", label: "Text classification", group: "Language" },
  { id: "token-classification", label: "Token classification", group: "Language" },
  { id: "translation", label: "Translation", group: "Language" },
  { id: "summarization", label: "Summarization", group: "Language" },
  { id: "question-answering", label: "Question answering", group: "Language" },
  { id: "fill-mask", label: "Fill mask", group: "Language" },
  { id: "sentence-similarity", label: "Sentence similarity", group: "Language" },
  { id: "feature-extraction", label: "Embeddings", group: "Language" },
  { id: "text-to-image", label: "Text to image", group: "Vision" },
  { id: "image-to-image", label: "Image to image", group: "Vision" },
  { id: "image-to-video", label: "Image to video", group: "Vision" },
  { id: "image-classification", label: "Image classification", group: "Vision" },
  { id: "object-detection", label: "Object detection", group: "Vision" },
  { id: "image-segmentation", label: "Segmentation", group: "Vision" },
  { id: "text-to-video", label: "Text to video", group: "Vision" },
  { id: "automatic-speech-recognition", label: "Speech recognition", group: "Audio" },
  { id: "text-to-speech", label: "Text to speech", group: "Audio" },
  { id: "audio-classification", label: "Audio classification", group: "Audio" },
];

export const DATASET_TASKS: Task[] = [
  { id: "text-generation", label: "Text generation", group: "Language" },
  { id: "question-answering", label: "Question answering", group: "Language" },
  { id: "text-classification", label: "Text classification", group: "Language" },
  { id: "translation", label: "Translation", group: "Language" },
  { id: "summarization", label: "Summarization", group: "Language" },
  { id: "image-classification", label: "Image classification", group: "Vision" },
  { id: "text-to-image", label: "Text to image", group: "Vision" },
  { id: "object-detection", label: "Object detection", group: "Vision" },
  { id: "automatic-speech-recognition", label: "Speech recognition", group: "Audio" },
];

export function taskLabel(id?: string | null, lang: "en" | "ar" = "en"): string {
  if (!id) return "";
  if (lang === "ar" && TASK_AR[id]) return TASK_AR[id];
  return (
    MODEL_TASKS.find((t) => t.id === id)?.label ??
    DATASET_TASKS.find((t) => t.id === id)?.label ??
    id.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

/** Which Create mode can run a model with this task, if any. */
export function createMode(task?: string | null): "chat" | "photo" | "video" | "edit" | "animate" | null {
  if (task === "text-generation" || task === "image-text-to-text") return "chat";
  if (task === "text-to-image") return "photo";
  if (task === "text-to-video") return "video";
  if (task === "image-to-image") return "edit";
  if (task === "image-to-video") return "animate";
  return null;
}

export const MODEL_SORTS = [
  { id: "trendingScore", label: "Trending" },
  { id: "downloads", label: "Most downloads" },
  { id: "likes", label: "Most likes" },
  { id: "lastModified", label: "Recently updated" },
];
