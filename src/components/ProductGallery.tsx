import { useState } from "react";
import type { CatalogMediaRecord } from "../features/catalog/data/catalogRepository";
import { formatMessage, useI18n } from "../i18n";
import { ManagedImage } from "./ManagedImage";

export function ProductGallery({ images, name }: { images: CatalogMediaRecord[]; name: string }) {
  const { t } = useI18n();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = images[selectedIndex] ?? images[0];

  if (!selectedImage) {
    return <div className="product-gallery product-gallery--empty"><div className="product-gallery__main"><span className="managed-image-placeholder" aria-hidden="true">L</span></div></div>;
  }

  return (
    <div className="product-gallery" aria-label={formatMessage(t.product.detail.galleryAria, { name })}>
      <figure className="product-gallery__main">
        <ManagedImage src={selectedImage.url} alt={selectedImage.altText} fetchPriority="high" width={960} height={1200} />
        <figcaption><span aria-hidden="true">L</span> {t.product.detail.imageCaption}</figcaption>
      </figure>
      {images.length > 1 && (
        <div className="product-gallery__thumbs" aria-label={t.product.detail.chooseImages}>
          {images.map((image, index) => (
            <button
              className="product-gallery__thumb"
              data-selected={selectedIndex === index}
              type="button"
              aria-label={formatMessage(t.product.detail.imageButton, { index: index + 1, name })}
              aria-pressed={selectedIndex === index}
              onClick={() => setSelectedIndex(index)}
              key={image.id}
            >
              <ManagedImage src={image.url} alt="" loading="lazy" width={160} height={160} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
