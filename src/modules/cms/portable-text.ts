import crypto from "crypto";

/**
 * Lightweight, deliberately non-comprehensive plain-text <-> Portable Text
 * bridge — no rich-text editor library exists in this project yet, so the
 * admin body field is a plain textarea using a small markdown-like
 * convention: blank-line-separated paragraphs, "## "/"### " headings, "- "
 * bullet lines. Bold/italic/links within a paragraph are not supported;
 * editing an existing post that has them will flatten that formatting to
 * plain text on save. Good enough to actually write and publish content
 * from the admin today — a real editor is a bigger, separate piece of work.
 */

function key(): string {
  return crypto.randomBytes(6).toString("hex");
}

function textBlock(style: "normal" | "h2" | "h3", text: string) {
  return {
    _type: "block",
    _key: key(),
    style,
    children: [{ _type: "span", _key: key(), text, marks: [] }],
    markDefs: [],
  };
}

function listItemBlock(text: string) {
  return {
    _type: "block",
    _key: key(),
    style: "normal",
    listItem: "bullet",
    level: 1,
    children: [{ _type: "span", _key: key(), text, marks: [] }],
    markDefs: [],
  };
}

export function plainTextToBlocks(input: string): Record<string, unknown>[] {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const blocks: Record<string, unknown>[] = [];
  let paragraphLines: string[] = [];

  function flushParagraph() {
    if (paragraphLines.length === 0) return;
    blocks.push(textBlock("normal", paragraphLines.join(" ").trim()));
    paragraphLines = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") {
      flushParagraph();
      continue;
    }
    if (line.startsWith("### ")) {
      flushParagraph();
      blocks.push(textBlock("h3", line.slice(4).trim()));
    } else if (line.startsWith("## ")) {
      flushParagraph();
      blocks.push(textBlock("h2", line.slice(3).trim()));
    } else if (line.startsWith("- ")) {
      flushParagraph();
      blocks.push(listItemBlock(line.slice(2).trim()));
    } else {
      paragraphLines.push(line);
    }
  }
  flushParagraph();

  return blocks.length > 0 ? blocks : [textBlock("normal", "")];
}

export function blocksToPlainText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  return blocks
    .map((block) => {
      if (!block || typeof block !== "object" || (block as { _type?: string })._type !== "block") {
        return "";
      }
      const b = block as {
        style?: string;
        listItem?: string;
        children?: { text?: string }[];
      };
      const text = (b.children ?? []).map((c) => c.text ?? "").join("");
      if (b.listItem === "bullet") return `- ${text}`;
      if (b.style === "h2") return `## ${text}`;
      if (b.style === "h3") return `### ${text}`;
      return text;
    })
    .join("\n\n");
}
