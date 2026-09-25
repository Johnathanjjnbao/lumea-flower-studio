import type { ImgHTMLAttributes } from "react";
import type { AssetKey } from "../data/assets";

type AssetImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  asset: AssetKey;
};

export function AssetImage({ asset, ...props }: AssetImageProps) {
  return <img data-asset={asset} {...props} />;
}
