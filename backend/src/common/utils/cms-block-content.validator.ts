
import { BadRequestException } from '@nestjs/common';
import { safeLinkUrl, safeMediaUrl } from './safe-url.util';
import { CmsBlockType } from '../../../generated/prisma/client';



type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const unsafe = (what: string) =>
  new BadRequestException(`Unsafe or invalid URL in ${what}`);

function mediaUrl(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (isObj(v) && typeof v.url === 'string') return v.url;
  return undefined;
}

function checkMedia(v: unknown, what: string) {
  const url = mediaUrl(v);

  // Empty values are allowed for unfinished editor placeholders.
  if (url && safeMediaUrl(url) === null) {
    throw unsafe(what);
  }
}

function checkLexical(node: unknown, depth = 0): void {
  if (!isObj(node) || depth > 50) return;

  if (
    node.type === 'link' &&
    typeof node.url === 'string' &&
    node.url &&
    safeLinkUrl(node.url) === null
  ) {
    throw unsafe('rich text link');
  }

  if (Array.isArray(node.children)) {
    node.children.forEach((child) => checkLexical(child, depth + 1));
  }
}

export function assertSafeBlockContent(
  type: CmsBlockType,
  content: Obj,
): void {
  switch (type) {
    case 'BUTTONS': {
      const items = Array.isArray(content.items) ? content.items : [];

      for (const item of items) {
        if (isObj(item) && typeof item.url === 'string' && item.url) {
          if (safeLinkUrl(item.url) === null) {
            throw unsafe('button');
          }
        }
      }

      break;
    }

    case 'IMAGE':
      checkMedia(content.media, 'image');
      break;

    case 'GALLERY': {
      const items = Array.isArray(content.media) ? content.media : [];
      items.forEach((item) => checkMedia(item, 'gallery'));
      break;
    }

    case 'VIDEO':
      checkMedia(content.url, 'video');
      break;

    case 'RICH_TEXT': {
      if (
        typeof content.editorState !== 'string' ||
        !content.editorState
      ) {
        break;
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(content.editorState);
      } catch {
        throw new BadRequestException('Invalid rich text editorState');
      }

      if (isObj(parsed)) {
        checkLexical(parsed.root);
      }

      break;
    }

    default:
      break;
  }
}
