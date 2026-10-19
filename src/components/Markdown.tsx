import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

/** Renders a model or dataset card. Relative links and images resolve against the repo's file base. */
export default function Markdown({ source, base }: { source: string; base?: string }) {
  return (
    <div className="prose-card">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        urlTransform={(url) => {
          const safe = defaultUrlTransform(url);
          if (!base || !safe || /^(https?:|mailto:|#|\/)/i.test(safe)) return safe;
          try {
            return new URL(safe.replace(/^\.\//, ""), base).toString();
          } catch {
            return safe;
          }
        }}
        components={{
          a: ({ href, children }) => (
            <a href={href} rel="noreferrer nofollow" target={href?.startsWith("#") ? undefined : "_blank"}>
              {children}
            </a>
          ),
          // eslint-disable-next-line @next/next/no-img-element
          img: ({ src, alt }) => <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" />,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
