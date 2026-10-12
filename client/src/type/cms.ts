
export type PageStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type BlockType =
  | "RICH_TEXT"
  | "BULLET_LIST"
  | "CHECKLIST"
  | "BUTTONS"
  | "IMAGE"
  | "GALLERY"
  | "VIDEO"
  | "SPACER"
  | "ACCORDION";

export type MediaType = "IMAGE" | "VIDEO";

export type TextAlignment = "left" | "center" | "right";

export type ContentWidth = "full" | "wide" | "narrow";

export type ContentPadding = "none" | "small" | "medium" | "large";

export type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

// Media

export interface MediaAsset {
  id: string;
  type: MediaType;
  name: string;
  url: string;
  mimeType?: string;
  altText?: string;
  width?: number;
  height?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Block content types
export interface AccordionItem {
  id: string;
  label: string;
  value: string;
}

export interface AccordionContent {
  items: AccordionItem[];
}

export interface RichTextContent {
  editorState: string | null;
  plainText: string;
}

export interface ListContent {
  items: string[];
}

export interface ButtonItem {
  id: string;
  label: string;
  url: string;
}

export interface ButtonsContent {
  items: ButtonItem[];
}

export interface ImageContent {
  media: MediaAsset | { url: string } | string | null;
  altText: string;
}

export interface GalleryContent {
  media: Array<MediaAsset | { url: string } | string>;
}

export interface VideoContent {
  url: string;
  caption: string;
}

export interface SpacerContent {
  height: number;
}

// Settings

export interface BlockSettings {
  alignment?: TextAlignment;
  width?: ContentWidth;
  background?: string;
  padding?: ContentPadding;
}

export interface SectionSettings {
  background?: string;
  columns?: 1 | 2 | 3;
  padding?: ContentPadding;
}

// CMS block

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: Record<string, unknown>;
  settings: BlockSettings;
  sortOrder: number;
  isVisible: boolean;
}

// CMS section

export interface CmsSection {
  id: string;
  name: string;
  blocks: ContentBlock[];
  settings: SectionSettings;
  sortOrder: number;
  isVisible: boolean;
}

// CMS page

export interface CmsPage {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: PageStatus;
  sections: CmsSection[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImage?: string | null;
  publishAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Page API inputs

export interface CreatePageInput {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdatePageInput {
  name?: string;
  slug?: string;
  description?: string;
  status?: PageStatus;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  publishAt?: string | null;
  sections?: Array<{
    id?: string;
    name: string;
    isVisible?: boolean;
    settings?: SectionSettings;
    blocks: Array<{
      id?: string;
      type: BlockType;
      content: Record<string, unknown>;
      settings?: BlockSettings;
      isVisible?: boolean;
    }>;
  }>;
}

// Section API inputs

export interface CreateSectionInput {
  pageId: string;
  name: string;
  settings?: SectionSettings;
}

export interface UpdateSectionInput {
  name?: string;
  settings?: SectionSettings;
  isVisible?: boolean;
}

// Block API inputs

export interface CreateBlockInput {
  sectionId: string;
  type: BlockType;
  content?: Record<string, unknown>;
  settings?: BlockSettings;
}

export interface UpdateBlockInput {
  type?: BlockType;
  content?: Record<string, unknown>;
  settings?: BlockSettings;
  isVisible?: boolean;
}

// Media API inputs

export interface UpdateMediaInput {
  name?: string;
  altText?: string;
}

// API response

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Block labels

export const BLOCK_LABELS: Record<BlockType, string> = {
  RICH_TEXT: "Rich Text",
  BULLET_LIST: "Bullet List",
  CHECKLIST: "Checklist",
  BUTTONS: "Buttons / Links",
  IMAGE: "Image",
  GALLERY: "Gallery",
  VIDEO: "Video",
  SPACER: "Spacer",
  ACCORDION: "Accordion / FAQ",
};

export const BLOCK_TYPES = Object.keys(BLOCK_LABELS) as BlockType[];
