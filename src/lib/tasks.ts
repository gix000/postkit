export type Task = { id: string; label: string; group: string };

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

export function taskLabel(id?: string | null): string {
  if (!id) return "";
  return (
    MODEL_TASKS.find((t) => t.id === id)?.label ??
    DATASET_TASKS.find((t) => t.id === id)?.label ??
    id.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

/** Which playground mode can run a model with this task, if any. */
export function playgroundMode(task?: string | null): "chat" | "image" | null {
  if (task === "text-generation" || task === "image-text-to-text") return "chat";
  if (task === "text-to-image") return "image";
  return null;
}

export const MODEL_SORTS = [
  { id: "trendingScore", label: "Trending" },
  { id: "downloads", label: "Most downloads" },
  { id: "likes", label: "Most likes" },
  { id: "lastModified", label: "Recently updated" },
];
