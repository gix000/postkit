/** "Use this model" snippets built on the open-source Hugging Face libraries. */
export function modelSnippet(id: string, task?: string, library?: string): string {
  if (library === "diffusers" || task === "text-to-image") {
    return `from diffusers import DiffusionPipeline

pipe = DiffusionPipeline.from_pretrained("${id}")
image = pipe("a quiet street in Beirut at dawn").images[0]`;
  }
  if (library === "sentence-transformers") {
    return `from sentence_transformers import SentenceTransformer

model = SentenceTransformer("${id}")
vectors = model.encode(["first sentence", "second sentence"])`;
  }
  if (library === "transformers" && task) {
    return `from transformers import pipeline

pipe = pipeline("${task}", model="${id}")`;
  }
  return `from huggingface_hub import snapshot_download

path = snapshot_download(repo_id="${id}")`;
}

export function inferenceSnippet(id: string): string {
  return `from huggingface_hub import InferenceClient

client = InferenceClient()
reply = client.chat_completion(
    model="${id}",
    messages=[{"role": "user", "content": "Hello"}],
)`;
}

export function datasetSnippet(id: string): string {
  return `from datasets import load_dataset

ds = load_dataset("${id}")`;
}
