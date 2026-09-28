import type { ImgHTMLAttributes } from "react";

type ManagedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
};

export function ManagedImage({ src, ...props }: ManagedImageProps) {
  return <img data-managed-image src={src} {...props} />;
}
