import DOMPurify from "dompurify";

export function SafeHtml({ html, className }: { html: string; className?: string }) {
  const clean = DOMPurify.sanitize(html || "", {
    ADD_ATTR: ["target", "rel"],
  });
  return (
    <div
      className={`prose prose-sm max-w-none ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
