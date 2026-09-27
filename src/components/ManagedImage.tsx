import type { ImgHTMLAttributes, SyntheticEvent } from "react";

type ManagedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
};

function markReady(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  image.classList.add("image-decoded");
  image.closest("figure, a")?.classList.add("image-ready");
}

function markMissing(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  image.hidden = true;
  image.closest("figure, a")?.classList.add("image-missing");
}

export function ManagedImage({ onLoad, onError, ...props }: ManagedImageProps) {
  return (
    <img
      data-managed-image="true"
      referrerPolicy="no-referrer"
      {...props}
      onLoad={(event) => {
        markReady(event);
        onLoad?.(event);
      }}
      onError={(event) => {
        markMissing(event);
        onError?.(event);
      }}
    />
  );
}
