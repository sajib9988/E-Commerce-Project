import {
  AccordionItem,
  CmsPage,
  CmsSection,
  ContentBlock,
} from "@/type/cms";

type Props = { page: CmsPage };

const ALIGN = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

const WIDTH = {
  narrow: "max-w-2xl",
  wide: "max-w-6xl",
  full: "max-w-none",
} as const;

const PADDING = {
  none: "py-0",
  small: "py-4",
  medium: "py-8",
  large: "py-16",
} as const;

function getPlainText(value: unknown): string {
  if (typeof value === "string") return value;
  if (
    value &&
    typeof value === "object" &&
    "plainText" in value &&
    typeof value.plainText === "string"
  ) {
    return value.plainText;
  }
  return "";
}

function isAccordionItem(value: unknown): value is AccordionItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "label" in value &&
    typeof value.label === "string" &&
    "value" in value &&
    typeof value.value === "string"
  );
}

function BlockRenderer({ block }: { block: ContentBlock }) {
  if (!block.isVisible) return null;

  const content = block.content;
  const wrapperClass = `mx-auto w-full ${
    WIDTH[block.settings.width ?? "full"]
  } ${ALIGN[block.settings.alignment ?? "left"]}`;

  switch (block.type) {
    case "RICH_TEXT":
      return (
        <div className={wrapperClass}>
          <p className="whitespace-pre-wrap">{getPlainText(content.plainText)}</p>
        </div>
      );

    case "BULLET_LIST":
    case "CHECKLIST": {
      const items = Array.isArray(content.items)
        ? content.items.filter(
            (item): item is string => typeof item === "string" && item.length > 0,
          )
        : [];

      return (
        <ul
          className={`${wrapperClass} ${
            block.type === "BULLET_LIST" ? "list-disc space-y-2 pl-6" : "space-y-2"
          }`}
        >
          {items.map((item, index) => (
            <li key={`${index}-${item}`}>
              {block.type === "CHECKLIST" ? "✓ " : ""}
              {item}
            </li>
          ))}
        </ul>
      );
    }

    case "BUTTONS": {
      const items = Array.isArray(content.items) ? content.items : [];
      return (
        <div className="flex flex-wrap gap-3">
          {items.map((value, index) => {
            if (
              typeof value !== "object" ||
              value === null ||
              !("label" in value) ||
              typeof value.label !== "string" ||
              !("url" in value) ||
              typeof value.url !== "string"
            ) {
              return null;
            }
            return (
              <a
                key={index}
                href={value.url}
                className="inline-flex rounded-md bg-primary px-4 py-2 text-primary-foreground"
              >
                {value.label}
              </a>
            );
          })}
        </div>
      );
    }

    case "IMAGE": {
      const media = content.media;
      const url =
        typeof media === "object" &&
        media !== null &&
        "url" in media &&
        typeof media.url === "string"
          ? media.url
          : typeof media === "string"
            ? media
            : "";
      if (!url) return null;

      return (
        <figure className={wrapperClass}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={typeof content.altText === "string" ? content.altText : ""}
            className="h-auto w-full rounded-lg object-cover"
          />
        </figure>
      );
    }

    case "GALLERY": {
      const media = Array.isArray(content.media) ? content.media : [];
      return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {media.map((item, index) => {
            const url =
              typeof item === "string"
                ? item
                : typeof item === "object" &&
                    item !== null &&
                    "url" in item &&
                    typeof item.url === "string"
                  ? item.url
                  : "";
            if (!url) return null;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={index}
                src={url}
                alt={
                  typeof item === "object" &&
                  item !== null &&
                  "altText" in item &&
                  typeof item.altText === "string"
                    ? item.altText
                    : ""
                }
                className="h-48 w-full rounded-lg object-cover"
              />
            );
          })}
        </div>
      );
    }

    case "VIDEO": {
      const url = typeof content.url === "string" ? content.url : "";
      if (!url) return null;
      return (
        <div className={wrapperClass}>
          {typeof content.caption === "string" && content.caption && (
            <p className="mb-2">{content.caption}</p>
          )}
          <video controls className="w-full rounded-lg" src={url} />
        </div>
      );
    }

    case "ACCORDION": {
      const items = Array.isArray(content.items)
        ? content.items.filter(isAccordionItem)
        : [];
      return (
        <div className={`${wrapperClass} space-y-2`}>
          {items.map((item) => (
            <details key={item.id} className="rounded-lg border p-4">
              <summary className="cursor-pointer font-medium">{item.label}</summary>
              <p className="mt-2 whitespace-pre-wrap">{item.value}</p>
            </details>
          ))}
        </div>
      );
    }

    case "SPACER": {
      const height =
        typeof content.height === "number"
          ? Math.min(Math.max(content.height, 0), 500)
          : 32;
      return <div aria-hidden="true" style={{ height }} />;
    }

    default:
      return null;
  }
}

function SectionRenderer({ section }: { section: CmsSection }) {
  if (!section.isVisible) return null;

  const columns = section.settings.columns ?? 1;
  const background = section.settings.background;

  return (
    <section
      className={`px-4 md:px-8 ${PADDING[section.settings.padding ?? "medium"]}`}
      style={
        background && background !== "transparent"
          ? { backgroundColor: background }
          : undefined
      }
    >
      <div
        className="mx-auto grid max-w-7xl gap-6"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {[...section.blocks]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((block) => (
            <div key={block.id}>
              <BlockRenderer block={block} />
            </div>
          ))}
      </div>
    </section>
  );
}

export default function PublicPageRenderer({ page }: Props) {
  const sections = [...page.sections].sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <main>
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </main>
  );
}