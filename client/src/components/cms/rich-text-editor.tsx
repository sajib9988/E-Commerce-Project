
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND
} from "lexical";
import type { EditorState, LexicalEditor } from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
} from "@lexical/list";
import { LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $setBlocksType } from "@lexical/selection";
import { $getNearestNodeOfType } from "@lexical/utils";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
} from "@lexical/rich-text";
import type { HeadingTagType } from "@lexical/rich-text";
import { RichTextContent } from "@/type/cms";

import { safeLinkUrl } from "@/lib/safe-url";


type RichTextEditorProps = {
  value: RichTextContent;
  onChange: (value: RichTextContent) => void;
  placeholder?: string;
};

const theme = {
  paragraph: "mb-2",
  heading: {
    h1: "mb-3 text-3xl font-bold",
    h2: "mb-3 text-2xl font-bold",
    h3: "mb-2 text-xl font-semibold",
    h4: "mb-2 text-lg font-semibold",
    h5: "mb-2 text-base font-semibold",
    h6: "mb-2 text-sm font-semibold",
  },
  quote: "my-3 border-l-4 pl-4 italic text-gray-600",
  list: {
    ul: "my-2 list-disc pl-6",
    ol: "my-2 list-decimal pl-6",
    listitem: "my-1",
  },
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
    code: "rounded bg-gray-100 px-1 font-mono text-sm",
  },
  link: "text-blue-600 underline",
};

function ToolbarButton({
  label,
  onClick,
  active = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded border px-2 py-1 text-sm transition-colors disabled:opacity-40 ${
        active ? "bg-gray-200 font-semibold" : "bg-white hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [formats, setFormats] = useState<string[]>([]);
  const [blockType, setBlockType] = useState("paragraph");

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) {
      setFormats([]);
      return;
    }

    const nextFormats: string[] = [];

    if (selection.hasFormat("bold")) nextFormats.push("bold");
    if (selection.hasFormat("italic")) nextFormats.push("italic");
    if (selection.hasFormat("underline")) nextFormats.push("underline");
    if (selection.hasFormat("strikethrough")) {
      nextFormats.push("strikethrough");
    }

    setFormats(nextFormats);

    const anchorNode = selection.anchor.getNode();
    const topLevelNode = anchorNode.getTopLevelElementOrThrow();

    if ($isHeadingNode(topLevelNode)) {
      setBlockType(topLevelNode.getTag());
    } else if ($isQuoteNode(topLevelNode)) {
      setBlockType("quote");
    } else {
      setBlockType("paragraph");
    }
  }, []);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        editor.getEditorState().read(updateToolbar);
        return false;
      },
      1,
    );
  }, [editor, updateToolbar]);

  const formatText = (format: "bold" | "italic" | "underline" | "strikethrough") => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatBlock = (type: string) => {
    editor.update(() => {
      const selection = $getSelection();

      if (!$isRangeSelection(selection)) return;

      if (type === "paragraph") {
        $setBlocksType(selection, () => $createParagraphNode());
      } else if (type === "quote") {
        $setBlocksType(selection, () => $createQuoteNode());
      } else {
        $setBlocksType(selection, () =>
          $createHeadingNode(type as HeadingTagType),
        );
      }
    });
  };


const insertLink = () => {
  const input = window.prompt("Enter URL")?.trim();
  if (!input) return;

  const withScheme =
    /^[a-z][a-z0-9+.-]*:/i.test(input) ||
    /^[/#]/.test(input)
      ? input
      : `https://${input}`;

  const url = safeLinkUrl(withScheme);

  if (!url) {
    window.alert(
      "Only http(s), mailto, tel or relative links are allowed.",
    );
    return;
  }

  editor.dispatchCommand(TOGGLE_LINK_COMMAND, {
    url,
    target: "_blank",
    rel: "noopener noreferrer",
  });
};


  return (
    <div className="flex flex-wrap gap-1 border-b p-2">
      <select
        aria-label="Block format"
        value={blockType}
        onChange={(event) => formatBlock(event.target.value)}
        className="rounded border px-2 py-1 text-sm"
      >
        <option value="paragraph">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="h4">Heading 4</option>
        <option value="h5">Heading 5</option>
        <option value="h6">Heading 6</option>
        <option value="quote">Quote</option>
      </select>

      <ToolbarButton
        label="B"
        active={formats.includes("bold")}
        onClick={() => formatText("bold")}
      />

      <ToolbarButton
        label="I"
        active={formats.includes("italic")}
        onClick={() => formatText("italic")}
      />

      <ToolbarButton
        label="U"
        active={formats.includes("underline")}
        onClick={() => formatText("underline")}
      />

      <ToolbarButton
        label="S"
        active={formats.includes("strikethrough")}
        onClick={() => formatText("strikethrough")}
      />

      <ToolbarButton
        label="• List"
        onClick={() =>
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        }
      />

      <ToolbarButton
        label="1. List"
        onClick={() =>
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        }
      />

      <ToolbarButton label="Link" onClick={insertLink} />

    <ToolbarButton
  label="Undo"
  onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
/>
    </div>
  );
}



function PlainTextPlugin({
  onChange,
}: {
  onChange: (value: RichTextContent) => void;
}) {
  const handleChange = useCallback(
    (editorState: EditorState, editor: LexicalEditor) => {
      const editorStateJson = JSON.stringify(editorState.toJSON());
      let plainText = "";

      editorState.read(() => {
        plainText = $getRoot().getTextContent();
      });

      onChange({
        editorState: editorStateJson,
        plainText,
      });
    },
    [onChange],
  );

  return <OnChangePlugin onChange={handleChange} />;
}

function EditorInitializer({ value }: { value: RichTextContent }) {
  const [editor] = useLexicalComposerContext();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || !value.editorState) {
      setInitialized(true);
      return;
    }

    try {
      const parsedState = editor.parseEditorState(value.editorState);
      editor.setEditorState(parsedState);
    } catch {
      editor.update(() => {
        const root = $getRoot();
        root.clear();

        if (value.plainText) {
          root.append($createParagraphNode());
          const paragraph = root.getFirstChild();

          if (paragraph) {
            paragraph.selectEnd();
            document.execCommand("insertText", false, value.plainText);
          }
        }
      });
    }

    setInitialized(true);
  }, [editor, initialized, value.editorState, value.plainText]);

  return null;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your content...",
}: RichTextEditorProps) {
  const initialConfig = {
    namespace: "CmsRichTextEditor",
    theme,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
    ],
    onError(error: Error) {
      console.error("Lexical editor error:", error);
    },
  };

  return (
    <div className="overflow-hidden rounded-md border">
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />

        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="min-h-40 p-3 outline-none"
                aria-label="Rich text editor"
              />
            }
            placeholder={
              <div className="pointer-events-none absolute left-3 top-3 text-sm text-gray-400">
                {placeholder}
              </div>
            }
            ErrorBoundary={({ children }) => <>{children}</>}
          />

          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <EditorInitializer value={value} />
          <PlainTextPlugin onChange={onChange} />
        </div>
      </LexicalComposer>
    </div>
  );
}
