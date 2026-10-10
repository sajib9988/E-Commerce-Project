import { CmsPage, CmsSection, ContentBlock } from "@/type/cms";


type Props = {
  page: CmsPage;
};

function BlockRenderer({ block }: { block: ContentBlock }) {
  if (!block.isVisible) return null;

  const content = block.content;
  const alignment = block.settings.alignment ?? "left";
  const width = block.settings.width ?? "full";

  const widthClass =
    width === "narrow"
      ? "max-w-2xl"
      : width === "wide"
        ? "max-w-6xl"
        : "max-w-none";

  const wrapperClass =
    `mx-auto w-full ${widthClass} ` +
    `text-${alignment}`;

  switch (block.type) {
    case "RICH_TEXT": {
      const text =
        typeof content.plainText === "string"
          ? content.plainText
          : "";

      return (
        <div className={wrapperClass}>
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
      );
    }

    case "BULLET_LIST":
    case "CHECKLIST": {
      const items = Array.isArray(content.items)
        ? content.items.filter(
            (item): item is string =>
              typeof item === "string" && item.length > 0,
          )
        : [];

      const ListTag =
        block.type === "BULLET_LIST" ? "ul" : "ul";

      return (
        <ListTag
          className={
            block.type === "BULLET_LIST"
              ? "list-disc space-y-2 pl-6"
              : "space-y-2"
          }
        >
          {items.map((item, index) => (
            <li key={`${index}-${item}`}>
              {block.type === "CHECKLIST" ? "✓ " : ""}
              {item}
            </li>
          ))}
        </ListTag>
      );
    }

    case "BUTTONS": {
      const items = Array.isArray(content.items)
        ? content.items
        : [];

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
          : "";

      if (!url) return null;

      return (
        <figure className={wrapperClass}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={
              typeof content.altText === "string"
                ? content.altText
                : ""
            }
            className="h-auto w-full rounded-lg object-cover"
          />
        </figure>
      );
    }

    case "GALLERY": {
      const media = Array.isArray(content.media)
        ? content.media
        : [];

      return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {media.map((item, index) => {
            if (
              typeof item !== "object" ||
              item === null ||
              !("url" in item) ||
              typeof item.url !== "string"
            ) {
              return null;
            }

            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={index}
                src={item.url}
                alt={
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
      const url =
        typeof content.url === "string"
          ? content.url
          : "";

      if (!url) return null;

      return (
        <div className={wrapperClass}>
          <p className="mb-2">
            {typeof content.caption === "string"
              ? content.caption
              : ""}
          </p>
          <video
            controls
            className="w-full rounded-lg"
            src={url}
          />
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

function SectionRenderer({
  section,
}: {
  section: CmsSection;
}) {
  if (!section.isVisible) return null;

  const columns = section.settings.columns ?? 1;

  return (
    <section className="px-4 py-8 md:px-8">
      <div
        className="mx-auto grid max-w-7xl gap-6"
        style={{
          gridTemplateColumns:
            `repeat(${columns}, minmax(0, 1fr))`,
        }}
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
  const sections = [...page.sections].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  return (
    <main>
      {sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
        />
      ))}
    </main>
  );
}
