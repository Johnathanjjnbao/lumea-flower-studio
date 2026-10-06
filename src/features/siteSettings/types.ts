export interface SiteProfile {
  businessName: string;
  phone: string;
  email: string;
  instagramUrl: string;
  instagramHandle: string;
}

export const emptySiteProfile = (): SiteProfile => ({
  businessName: "",
  phone: "",
  email: "",
  instagramUrl: "",
  instagramHandle: "",
});
