import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Compact, styled markdown for agent responses (no typography plugin needed). */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: (props) => <p className="my-1" {...props} />,
          ul: (props) => <ul className="my-1 list-disc space-y-1 pl-5" {...props} />,
          ol: (props) => <ol className="my-1 list-decimal space-y-1 pl-5" {...props} />,
          li: (props) => <li className="marker:text-muted-foreground" {...props} />,
          h1: (props) => <h3 className="mt-2 mb-1 font-semibold" {...props} />,
          h2: (props) => <h3 className="mt-2 mb-1 font-semibold" {...props} />,
          h3: (props) => <h3 className="mt-2 mb-1 font-semibold" {...props} />,
          strong: (props) => <strong className="font-semibold" {...props} />,
          a: (props) => <a className="text-primary underline" {...props} />,
          code: (props) => (
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs" {...props} />
          ),
          hr: () => <hr className="my-3" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
