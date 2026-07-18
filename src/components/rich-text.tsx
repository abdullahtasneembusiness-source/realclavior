"use client";

import { useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { htmlToText, toRenderableHtml } from "@/lib/rich-text";

// Shared, minimal extension set — headings limited to H2/H3, links sanitized and
// opened in a new tab. This same schema is the allowlist when rendering stored
// content read-only, so a hand-crafted body can't smuggle in scripts.
function extensions(openOnClick: boolean) {
  return [
    StarterKit.configure({ heading: { levels: [2, 3] } }),
    Link.configure({
      openOnClick,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
    }),
  ];
}

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-input p-1">
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Link"
        active={editor.isActive("link")}
        onClick={setLink}
      >
        <LinkIcon className="size-4" />
      </ToolbarButton>
    </div>
  );
}

/**
 * Rich text field for a form. Renders a small toolbar + editor and keeps a hidden
 * input (named `name`) in sync with the editor HTML so the existing server-action
 * form flow is unchanged. Emits "" when there is no text so empty entries stay empty.
 */
export function RichTextEditor({
  name,
  defaultValue,
  editorId,
  ariaLabel,
}: {
  name: string;
  defaultValue?: string | null;
  editorId?: string;
  ariaLabel?: string;
}) {
  const [value, setValue] = useState(() =>
    htmlToText(defaultValue).length > 0 ? toRenderableHtml(defaultValue) : "",
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: extensions(false),
    content: toRenderableHtml(defaultValue),
    editorProps: {
      attributes: {
        ...(editorId ? { id: editorId } : {}),
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
        class:
          "rich-content min-h-[9rem] max-h-[22rem] overflow-y-auto px-3 py-2 text-sm focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      setValue(editor.getText().trim() === "" ? "" : editor.getHTML());
    },
  });

  return (
    <div className="rounded-md border border-input bg-card shadow-sm focus-within:ring-1 focus-within:ring-ring">
      {editor ? <Toolbar editor={editor} /> : null}
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={value} readOnly />
    </div>
  );
}

/** Read-only render of a stored rich body (schema-constrained, links clickable). */
export function RichTextViewer({ body }: { body: string | null | undefined }) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: extensions(true),
    content: toRenderableHtml(body),
    editorProps: {
      attributes: { class: "rich-content text-sm" },
    },
  });

  return <EditorContent editor={editor} />;
}
