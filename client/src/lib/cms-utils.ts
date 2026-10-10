import type {
  BlockType,
  CmsPage,
  CmsSection,
  ContentBlock,
} from "@/type/cms";

export function makeId(prefix = "id"): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createBlock(
  type: BlockType,
  sortOrder = 0,
): ContentBlock {
  const base = {
    id: makeId("block"),
    type,
    sortOrder,
    isVisible: true,
    settings: {
      alignment: "left" as const,
      width: "full" as const,
      padding: "medium" as const,
    },
  };

  switch (type) {
    case "RICH_TEXT":
      return {
        ...base,
        content: {
          editorState: null,
          plainText: "",
        },
      };

    case "BULLET_LIST":
    case "CHECKLIST":
      return {
        ...base,
        content: {
          items: [""],
        },
      };

    case "BUTTONS":
      return {
        ...base,
        content: {
          items: [
            {
              id: makeId("button"),
              label: "Learn more",
              url: "/",
            },
          ],
        },
      };

    case "IMAGE":
      return {
        ...base,
        content: {
          media: null,
          altText: "",
        },
      };

    case "GALLERY":
      return {
        ...base,
        content: {
          media: [],
        },
      };

    case "VIDEO":
      return {
        ...base,
        content: {
          url: "",
          caption: "",
        },
      };

    case "SPACER":
      return {
        ...base,
        content: {
          height: 32,
        },
      };

    default: {
      const exhaustiveCheck: never = type;
      throw new Error(
        `Unsupported block type: ${exhaustiveCheck}`,
      );
    }
  }
}

export function createSection(
  name = "New Section",
  sortOrder = 0,
): CmsSection {
  return {
    id: makeId("section"),
    name,
    blocks: [],
    settings: {
      background: "transparent",
      columns: 1,
      padding: "medium",
    },
    sortOrder,
    isVisible: true,
  };
}

export function createPage(
  name: string,
  slug: string,
): CmsPage {
  const now = new Date().toISOString();

  return {
    id: makeId("page"),
    name,
    slug,
    description: "",
    status: "DRAFT",
    sections: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function sortByOrder<
  T extends { sortOrder: number },
>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

export function normalizeOrder<
  T extends { sortOrder: number },
>(items: T[]): T[] {
  return items.map((item, index) => ({
    ...item,
    sortOrder: index,
  }));
}
