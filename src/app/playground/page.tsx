import { redirect } from "next/navigation";

/** Old address — the playground is now Create. */
export default async function PlaygroundRedirect({ searchParams }: PageProps<"/playground">) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) if (typeof v === "string") sp.set(k, k === "mode" && v === "image" ? "photo" : v);
  const q = sp.toString();
  redirect(q ? `/create?${q}` : "/create");
}
