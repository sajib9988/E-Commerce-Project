
import { Fragment, type ReactNode } from "react";
import { safeLinkUrl } from "@/lib/safe-url";

type LexicalNode = {
  type: string;
  children?: LexicalNode[];
  text?: string;
  format?: number | string;
  tag?: string;
  listType?: string;
  url?: string;
  target?: string | null;
};

const HEADING_CLASS: Record<string, string> = {
  h1: "mb-4 text-4xl font-bold tracking-tight",
  h2: "mb-3 text-3xl font-bold tracking-tight",
  h3: "mb-3 text-2xl font-semibold",
  h4: "mb-2 text-xl font-semibold",
  h5: "mb-2 text-lg font-semibold",
  h6: "mb-2 text-base font-semibold",
};

const ALIGN_CLASS: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
  justify: "text-justify",
};

function alignClass(node: LexicalNode): string {
  return typeof node.format === "string"
    ? (ALIGN_CLASS[node.format] ?? "")
    : "";
}

function renderText(node: LexicalNode, key: number): ReactNode {
  const f = typeof node.format === "number" ? node.format : 0;
  let el: ReactNode = node.text ?? "";

  if (f & 16) {
    el = (
      <code className="rounded bg-black/5 px-1 font-mono text-[0.9em]">
        {el}
      </code>
    );
  }

  if (f & 64) el = <sup>{el}</sup>;
  if (f & 32) el = <sub>{el}</sub>;
  if (f & 1) el = <strong>{el}</strong>;
  if (f & 2) el = <em>{el}</em>;

  const deco = [
    f & 8 && "underline",
    f & 4 && "line-through",
  ]
    .filter(Boolean)
    .join(" ");

  if (deco) el = <span className={deco}>{el}</span>;

  return <Fragment key={key}>{el}</Fragment>;
}

function renderChildren(
  nodes: LexicalNode[] | undefined,
): ReactNode[] {
  return (nodes ?? []).map((node, index) =>
    renderNode(node, index),
  );
}

function renderNode(node: LexicalNode, key: number): ReactNode {
  switch (node.type) {
    case "text":
      return renderText(node, key);

    case "linebreak":
      return <br key={key} />;

    case "paragraph":
      return (
        <p
          key={key}
          className={`mb-4 leading-7 ${alignClass(node)}`}
        >
          {node.children?.length
            ? renderChildren(node.children)
            : <br />}
        </p>
      );

    case "heading": {
      const tag =
        node.tag && node.tag in HEADING_CLASS
          ? node.tag
          : "h2";

      const Tag = tag as
        | "h1"
        | "h2"
        | "h3"
        | "h4"
        | "h5"
        | "h6";

      return (
        <Tag
          key={key}
          className={`${HEADING_CLASS[tag]} ${alignClass(node)}`}
        >
          {renderChildren(node.children)}
        </Tag>
      );
    }

    case "quote":
      return (
        <blockquote
          key={key}
          className="my-4 border-l-4 pl-4 italic text-muted-foreground"
        >
          {renderChildren(node.children)}
        </blockquote>
      );

    case "list": {
      const ordered = node.listType === "number";
      const Tag = ordered ? "ol" : "ul";

      return (
        <Tag
          key={key}
          className={`mb-4 pl-6 ${
            ordered ? "list-decimal" : "list-disc"
          }`}
        >
          {renderChildren(node.children)}
        </Tag>
      );
    }

    case "listitem": {
      const nested =
        node.children?.length === 1 &&
        node.children[0].type === "list";

      return (
        <li key={key} className={nested ? "list-none" : "my-1"}>
          {renderChildren(node.children)}
        </li>
      );
    }

    case "link": {
      const href = safeLinkUrl(node.url);

      // Unsafe URL হলে link বাদ, কিন্তু text থাকবে।
      if (!href) {
        return (
          <Fragment key={key}>
            {renderChildren(node.children)}
          </Fragment>
        );
      }

      const blank = node.target === "_blank";

      return (
        <a
          key={key}
          href={href}
          className="text-blue-600 underline"
          {...(
            blank
              ? {
                  target: "_blank",
                  rel: "noopener noreferrer",
                }
              : {}
          )}
        >
          {renderChildren(node.children)}
        </a>
      );
    }

    default:
      // Unknown node-এর raw data render হবে না।
      return node.children?.length ? (
        <Fragment key={key}>
          {renderChildren(node.children)}
        </Fragment>
      ) : null;
  }
}

/** Valid editorState হলে React tree, নাহলে null। */
export function renderLexical(
  editorState: string,
): ReactNode | null {
  try {
    const parsed = JSON.parse(editorState) as {
      root?: LexicalNode;
    };

    if (!parsed.root?.children) return null;

    return <>{renderChildren(parsed.root.children)}</>;
  } catch {
    return null;
  }
}
