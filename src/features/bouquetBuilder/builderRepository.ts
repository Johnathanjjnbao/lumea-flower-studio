import type { Locale } from "../../types/content";
import type { BouquetBuilderCatalog } from "./types";

export interface BuilderRepository {
  loadPublishedBuilder(locale: Locale): Promise<BouquetBuilderCatalog>;
}
