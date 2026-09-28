import type { Locale } from "../../../types/content";
import type { HomepageSection } from "../types";

export interface HomepageRepository {
  getHomepageSections(locale: Locale): Promise<HomepageSection[]>;
}
