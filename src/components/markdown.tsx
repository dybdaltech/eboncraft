import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

type Props = {
  source: string;
  /** "owner/repo", used to resolve relative links and images in the README. */
  repo: string;
  branch: string;
};

function resolveUrl(url: string, key: string, repo: string, branch: string): string {
  if (!url || url.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//")) {
    return defaultUrlTransform(url);
  }
  const path = url.replace(/^\.?\//, "");
  const base = key === "src" ? `https://raw.githubusercontent.com/${repo}/${branch}/` : `https://github.com/${repo}/blob/${branch}/`;
  return new URL(path, base).toString();
}

/** Renders a GitHub README: GFM, sanitized inline HTML, and repo-relative links/images. */
export function Markdown({ source, repo, branch }: Props) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        urlTransform={(url, key) => resolveUrl(url, key, repo, branch)}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target={props.href?.startsWith("#") ? undefined : "_blank"} rel="noopener noreferrer nofollow" />,
          // eslint-disable-next-line @next/next/no-img-element
          img: ({ node: _node, ...props }) => <img {...props} alt={props.alt ?? ""} loading="lazy" />,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
