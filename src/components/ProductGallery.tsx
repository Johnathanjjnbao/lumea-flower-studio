import { useState } from "react";
import type { AssetKey } from "../data/assets";
import { formatMessage, useI18n } from "../i18n";
import { AssetImage } from "./AssetImage";

export function ProductGallery({ images, name }: { images: Array<{ asset: AssetKey; alt: string }>; name: string }) {
  const { t } = useI18n();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = images[selectedIndex] ?? images[0];

  return (
    <div className="product-gallery" aria-label={formatMessage(t.product.detail.galleryAria, { name })}>
      <figure className="product-gallery__main">
        <AssetImage asset={selectedImage.asset} alt={selectedImage.alt} fetchPriority="high" />
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
              key={`${image.asset}-${index}`}
            >
              <AssetImage asset={image.asset} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
