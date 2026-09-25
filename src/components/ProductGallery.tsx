import { useState } from "react";
import type { ProductImage } from "../types/content";
import { AssetImage } from "./AssetImage";

export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = images[selectedIndex] ?? images[0];

  return (
    <div className="product-gallery" aria-label={`Hình ảnh ${name}`}>
      <figure className="product-gallery__main">
        <AssetImage asset={selectedImage.asset} alt={selectedImage.alt} fetchPriority="high" />
      </figure>
      {images.length > 1 && (
        <div className="product-gallery__thumbs" aria-label="Chọn ảnh sản phẩm">
          {images.map((image, index) => (
            <button
              className="product-gallery__thumb"
              data-selected={selectedIndex === index}
              type="button"
              aria-label={`Xem ảnh ${index + 1} của ${name}`}
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
