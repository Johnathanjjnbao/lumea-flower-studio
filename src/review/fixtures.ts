import { assets, type AssetKey } from "../data/assets";
import { flowerStems, wrappingTypes, wrappingVariants } from "../features/bouquetBuilder/data";
import type { BouquetBuilderCatalog } from "../features/bouquetBuilder/types";
import { localCatalogRepository } from "../features/catalog/data/localCatalogRepository";
import type { CatalogProductRecord, CatalogRepository } from "../features/catalog/data/catalogRepository";
import type { CheckoutOptions } from "../features/checkout/types";
import type { PublishedCommercialContent, CommercialContentCode } from "../features/commercialContent/types";
import type { DiscoveryOptions } from "../features/discovery/types";
import { emptyHomepageCopy, emptyHomepageVisitSettings, homepageSectionKeys, type HomepageContent, type HomepageMedia, type HomepageSection, type HomepageSectionKey } from "../features/homepage/types";
import type { StorefrontNavigationItem } from "../features/navigation/types";
import type { SiteProfile } from "../features/siteSettings/types";
import { ko } from "../i18n/ko";
import { vi } from "../i18n/vi";
import type { Locale } from "../types/content";

// Local, illustrative review fixtures. They are never an Admin or live-data source.
const dictionaries = { vi, ko } as const;
const demoPrices: Record<string, number> = {
  "pink-garden": 590_000, "morning-peony": 720_000, "white-poetry": 680_000,
  "warm-embrace": 790_000, "rose-letter": 520_000, "amber-afternoon": 860_000,
  "hydrangea-cloud": 920_000, "spring-note": 650_000, "velvet-promise": 890_000,
  "quiet-calla": 550_000,
};
const bestSellerIds = ["pink-garden", "warm-embrace", "rose-letter", "amber-afternoon", "spring-note", "quiet-calla"];

export const reviewCatalogRepository: CatalogRepository = {
  listPublishedCategories: (locale) => localCatalogRepository.listPublishedCategories(locale),
  async listPublishedProducts(locale, filters) {
    const products = await localCatalogRepository.listPublishedProducts(locale, filters);
    return products.map((product) => {
      const difference = demoPrices[product.id] - product.startingPriceAmount;
      const variants = product.variants.map((variant) => ({ ...variant, priceAmount: variant.priceAmount + difference }));
      return {
        ...product,
        bestseller: bestSellerIds.includes(product.id),
        startingPriceAmount: Math.min(...variants.map((variant) => variant.priceAmount)),
        variants,
        careInstructions: locale === "vi"
          ? "Thay nước sạch và cắt chéo gốc cành. Đặt hoa ở nơi mát, tránh nắng trực tiếp."
          : "물을 자주 갈고 줄기 끝을 사선으로 잘라 주세요. 직사광선을 피해 서늘한 곳에 두세요.",
      } satisfies CatalogProductRecord;
    });
  },
  async getPublishedProductBySlug(slug, locale) {
    return (await this.listPublishedProducts(locale)).find((product) => product.slug === slug) ?? null;
  },
};

const occasionImages: Record<string, AssetKey> = {
  birthday: "occasionBirthday", love: "occasionLove", congrats: "occasionCongrats",
  graduation: "occasionGraduation", opening: "occasionOpening", sympathy: "occasionSympathy",
};
const budgetImages: Record<string, AssetKey> = {
  small: "detailCalla", medium: "productRoseLetter", large: "productAmberStudy", statement: "productHydrangea",
};
const budgets = [
  { stableCode: "small", minAmount: 0, maxAmount: 599_999, vi: "Dưới 600.000đ", ko: "60만 동 미만" },
  { stableCode: "medium", minAmount: 600_000, maxAmount: 799_999, vi: "600–799.000đ", ko: "60만–79만 동" },
  { stableCode: "large", minAmount: 800_000, maxAmount: 999_999, vi: "800–999.000đ", ko: "80만–99만 동" },
  { stableCode: "statement", minAmount: 1_000_000, maxAmount: null, vi: "Từ 1.000.000đ", ko: "100만 동부터" },
];

export function getReviewDiscovery(locale: Locale): DiscoveryOptions {
  return {
    occasions: Object.keys(occasionImages).map((stableCode, index) => ({
      id: `review-occasion-${stableCode}`, stableCode,
      name: dictionaries[locale].occasions[stableCode as keyof typeof vi.occasions].name,
      description: "", sortOrder: index,
    })),
    budgetRanges: budgets.map((range, index) => ({
      id: `review-budget-${range.stableCode}`, stableCode: range.stableCode,
      minAmount: range.minAmount, maxAmount: range.maxAmount,
      scaleLabel: String(index + 1).padStart(2, "0"), label: range[locale],
      description: locale === "vi" ? "Mức giá minh họa" : "예시 가격대", sortOrder: index,
    })),
  };
}

type Copy = Partial<HomepageSection["copy"]>;
type HomeDraft = { vi: Copy; ko: Copy; primary?: string; secondary?: string };
const home: Record<HomepageSectionKey, HomeDraft> = {
  hero: {
    vi: { eyebrow: "LUMÉA FLOWER STUDIO", titleOne: "Hoa cho những điều", titleTwo: "khó nói thành lời.", body: "Một không gian để khám phá những bó hoa giàu cảm xúc, được kể qua từng sắc độ và dáng hoa.", primaryCtaLabel: "Xem bộ sưu tập", secondaryCtaLabel: "Tạo bó hoa của bạn" },
    ko: { eyebrow: "LUMÉA FLOWER STUDIO", titleOne: "말로 다 전하기", titleTwo: "어려운 마음을 꽃으로.", body: "색과 형태에 담긴 이야기를 따라, 마음에 어울리는 꽃다발을 만나보세요.", primaryCtaLabel: "컬렉션 보기", secondaryCtaLabel: "나만의 꽃다발 만들기" },
    primary: "/flowers", secondary: "/create-bouquet",
  },
  occasions: {
    vi: { eyebrow: "THEO DỊP", titleOne: "Mỗi khoảnh khắc,", titleTwo: "một cách nói riêng.", body: "Bắt đầu từ dịp bạn muốn ghi nhớ, rồi chọn thiết kế phù hợp." },
    ko: { eyebrow: "상황별 컬렉션", titleOne: "모든 순간에는", titleTwo: "저마다의 표현이 있어요.", body: "기억하고 싶은 순간에서 시작해 어울리는 디자인을 찾아보세요." },
  },
  best_sellers: {
    vi: { eyebrow: "ĐƯỢC YÊU THÍCH", titleOne: "Những thiết kế", titleTwo: "đáng ngắm lại.", primaryCtaLabel: "Xem tất cả", note: "Sản phẩm minh họa đang được chuẩn bị." },
    ko: { eyebrow: "많이 찾는 디자인", titleOne: "다시 보고 싶은", titleTwo: "꽃의 장면들.", primaryCtaLabel: "전체 보기", note: "예시 상품을 준비하고 있습니다." },
    primary: "/flowers",
  },
  budget: {
    vi: { eyebrow: "THEO NGÂN SÁCH", titleOne: "Một cử chỉ đẹp,", titleTwo: "ở mọi mức giá.", body: "Chọn khoảng giá minh họa để khám phá cách bó hoa thay đổi theo quy mô." },
    ko: { eyebrow: "예산별 컬렉션", titleOne: "어떤 예산에도", titleTwo: "아름다운 마음을.", body: "예시 가격대를 골라 다양한 크기의 디자인을 살펴보세요." },
  },
  same_day: {
    vi: { eyebrow: "KHI CẦN HOA SỚM", titleOne: "Một ý nghĩ đến", titleTwo: "đúng lúc.", body: "Khám phá trang giao trong ngày. Khả năng phục vụ thực tế chỉ được xác nhận khi cửa hàng mở bán.", primaryCtaLabel: "Xem hoa phù hợp", note: "Chỉ là bản xem trước" },
    ko: { eyebrow: "꽃이 급히 필요할 때", titleOne: "마음을 전할", titleTwo: "바로 그 순간.", body: "당일 배송 안내 화면을 살펴보세요. 실제 가능 여부는 정식 운영 시 확인됩니다.", primaryCtaLabel: "디자인 보기", note: "미리보기 전용" },
    primary: "/same-day",
  },
  florist_choice: {
    vi: { eyebrow: "FLORIST'S CHOICE", titleOne: "Để người làm hoa", titleTwo: "kể tiếp câu chuyện.", body: "Chọn ngân sách, sắc độ và dịp; trải nghiệm minh họa cho hành trình giao ý tưởng cho florist.", primaryCtaLabel: "Khám phá bộ sưu tập" },
    ko: { eyebrow: "FLORIST'S CHOICE", titleOne: "꽃을 만드는 사람에게", titleTwo: "이야기를 맡겨 보세요.", body: "예산과 분위기, 상황을 고르는 과정을 미리 살펴볼 수 있습니다.", primaryCtaLabel: "컬렉션 보기" },
    primary: "/flowers",
  },
  create_bouquet: {
    vi: { eyebrow: "DẤU ẤN RIÊNG", titleOne: "Một bó hoa", titleTwo: "mang tên bạn.", body: "Thử chọn từng cành hoa và kiểu giấy gói trong công cụ tạo bó hoa minh họa.", primaryCtaLabel: "Bắt đầu tạo bó hoa", secondaryHeading: "Cần trao đổi thêm?", secondaryBody: "Xem những cách liên hệ khi cửa hàng cung cấp kênh chính thức.", secondaryCtaLabel: "Trang liên hệ" },
    ko: { eyebrow: "나만의 꽃다발", titleOne: "당신의 이야기를", titleTwo: "담은 꽃다발.", body: "예시 꽃과 포장지를 골라 나만의 조합을 미리 만들어 보세요.", primaryCtaLabel: "꽃다발 만들기", secondaryHeading: "상담이 필요하신가요?", secondaryBody: "공식 연락처가 준비되면 문의 페이지에서 확인할 수 있습니다.", secondaryCtaLabel: "문의 페이지" },
    primary: "/create-bouquet", secondary: "/contact",
  },
  why_lumea: {
    vi: { eyebrow: "CÂU CHUYỆN LUMÉA", titleOne: "Từ sắc hoa", titleTwo: "đến cảm xúc.", body: "Ba góc nhìn về cách một ý tưởng trở thành bó hoa; nội dung chỉ để minh họa thiết kế.", primaryCtaLabel: "Xem câu chuyện" },
    ko: { eyebrow: "LUMÉA 이야기", titleOne: "꽃의 색에서", titleTwo: "마음의 표현까지.", body: "하나의 아이디어가 꽃다발이 되는 과정을 보여 주는 세 장면입니다. 예시 콘텐츠입니다.", primaryCtaLabel: "이야기 보기" },
    primary: "/about",
  },
  gallery: {
    vi: { eyebrow: "NHẬT KÝ HOA", titleOne: "Những khung hình", titleTwo: "đầy cảm hứng.", body: "Hình minh họa bố cục gallery, không phải tác phẩm đã bán.", primaryCtaLabel: "Về Luméa" },
    ko: { eyebrow: "플라워 저널", titleOne: "꽃에서 발견한", titleTwo: "영감의 장면.", body: "갤러리 구성을 위한 예시 이미지이며 실제 판매 작품이 아닙니다.", primaryCtaLabel: "Luméa 소개" },
    primary: "/about",
  },
  visit: {
    vi: { eyebrow: "GHÉ LUMÉA", titleOne: "Hẹn gặp ở studio.", body: "Địa chỉ, giờ mở cửa và kênh liên hệ chính thức sẽ được chủ cửa hàng cập nhật trước khi mở bán.", secondaryHeading: "Luméa Flower Studio", detailOneLabel: "Địa điểm", detailOneValue: "Chưa công bố", detailTwoLabel: "Giờ mở cửa", detailTwoValue: "Chưa công bố", primaryCtaLabel: "Xem trang liên hệ" },
    ko: { eyebrow: "LUMÉA 방문", titleOne: "스튜디오에서 만나요.", body: "주소, 영업시간, 공식 연락처는 정식 오픈 전에 운영자가 게시합니다.", secondaryHeading: "Luméa Flower Studio", detailOneLabel: "위치", detailOneValue: "미공개", detailTwoLabel: "영업시간", detailTwoValue: "미공개", primaryCtaLabel: "문의 페이지 보기" },
    primary: "/contact",
  },
};

function media(section: HomepageSectionKey, slotKey: string, asset: AssetKey, locale: Locale, index = 0): HomepageMedia {
  return {
    id: `review-${section}-${slotKey}`, mediaAssetId: `review-${asset}`, slotKey,
    url: assets[asset], altText: locale === "vi" ? "Ảnh hoa minh họa" : "예시 꽃 이미지",
    caption: locale === "vi" ? "Ảnh minh họa" : "예시 이미지", sortOrder: index, active: true,
  };
}

function sectionMedia(key: HomepageSectionKey, locale: Locale): HomepageMedia[] {
  switch (key) {
    case "hero": return [media(key, "hero-main", "heroMain", locale), media(key, "hero-detail", "heroDetail", locale, 1)];
    case "occasions": return Object.entries(occasionImages).map(([code, asset], index) => media(key, `occasion-${code}`, asset, locale, index));
    case "budget": return Object.entries(budgetImages).map(([code, asset], index) => media(key, `budget-${code}`, asset, locale, index));
    case "same_day": return [media(key, "same-day-main", "sameDay", locale)];
    case "florist_choice": return [media(key, "florist-main", "floristWorkspace", locale)];
    case "create_bouquet": return [media(key, "custom-main", "customBouquet", locale)];
    case "gallery": return (["galleryOne", "galleryTwo", "galleryThree", "galleryFour", "galleryFive", "gallerySix"] as AssetKey[]).map((asset, index) => media(key, `gallery-${index}`, asset, locale, index));
    default: return [];
  }
}

const whyCopy = {
  vi: [
    ["01 / SẮC ĐỘ", "Bắt đầu từ màu sắc", "Tìm một sắc hoa hợp với câu chuyện bạn muốn kể."],
    ["02 / HÌNH DÁNG", "Nhịp điệu của bó hoa", "Nhìn cách các dáng hoa tạo nên một bố cục tự nhiên."],
    ["03 / CHI TIẾT", "Lời nhắn của riêng bạn", "Hoàn thiện trải nghiệm bằng một lời nhắn gần gũi."],
  ],
  ko: [
    ["01 / 색감", "색에서 시작되는 이야기", "전하고 싶은 마음에 어울리는 꽃의 색을 찾아보세요."],
    ["02 / 형태", "꽃다발의 리듬", "서로 다른 꽃의 형태가 만드는 자연스러운 구성을 살펴보세요."],
    ["03 / 디테일", "나만의 메시지", "짧은 카드 한 장으로 마음을 더해 보세요."],
  ],
} as const;

export async function getReviewHomepage(locale: Locale): Promise<HomepageContent> {
  const products = await reviewCatalogRepository.listPublishedProducts(locale);
  const discovery = getReviewDiscovery(locale);
  const sections = Object.fromEntries(homepageSectionKeys.map((key) => {
    const draft = home[key];
    const section: HomepageSection = {
      id: `review-${key}`, key, enabled: true,
      primaryCtaTarget: draft.primary ?? null, secondaryCtaTarget: draft.secondary ?? null,
      visit: emptyHomepageVisitSettings(), copy: { ...emptyHomepageCopy(), ...draft[locale] },
      media: sectionMedia(key, locale),
      features: key === "why_lumea" ? whyCopy[locale].map(([label, title, body], index) => ({
        id: `review-why-${index}`, itemKey: `why-${index}`, label, title, body,
        media: media(key, `why-${index}`, (["whyLumea", "studioFlorist", "floristHands"] as AssetKey[])[index], locale, index),
        sortOrder: index, active: true,
      })) : [],
      curatedProductIds: key === "best_sellers" ? bestSellerIds : [],
    };
    return [key, section];
  })) as HomepageContent["sections"];
  const byId = new Map(products.map((product) => [product.id, product]));
  return {
    sections,
    featuredProducts: bestSellerIds.map((id) => byId.get(id)).filter((product): product is CatalogProductRecord => Boolean(product)),
    occasions: discovery.occasions, budgetRanges: discovery.budgetRanges,
  };
}

export const reviewSiteProfile: SiteProfile = {
  businessName: "Luméa Flower Studio", phone: "", email: "", instagramUrl: "", instagramHandle: "",
};

const policyCopy = {
  DELIVERY: { vi: ["Giao hoa & nhận tại studio", "Các lựa chọn chỉ mang tính minh họa.", "Phương thức, khu vực, thời gian và phí thực tế sẽ được xác nhận khi cửa hàng mở bán. Không đặt hàng thật trong bản xem trước."], ko: ["배송 및 방문 수령", "표시된 선택지는 예시입니다.", "실제 배송 지역, 시간 및 요금은 정식 운영 시 확인됩니다. 이 미리보기에서는 실제 주문을 받지 않습니다."] },
  RETURNS_REFUNDS: { vi: ["Đổi trả & hoàn tiền", "Nội dung chính thức cần chủ cửa hàng xác nhận.", "Bản xem trước không công bố thời hạn hay điều kiện đổi trả, hoàn tiền. Quyền của khách hàng theo pháp luật áp dụng không bị loại trừ."], ko: ["교환 및 환불", "공식 내용은 운영자 확인이 필요합니다.", "이 미리보기는 교환·환불 기한이나 조건을 공지하지 않습니다. 관련 법령에 따른 고객의 권리를 배제하지 않습니다."] },
  PAYMENT: { vi: ["Thanh toán", "Chỉ xem trước các bước thanh toán.", "Phương thức và hướng dẫn thanh toán thực tế phụ thuộc cấu hình cửa hàng khi mở bán. Bản demo không thu tiền."], ko: ["결제", "결제 화면의 예시입니다.", "실제 결제 방법과 안내는 정식 운영 설정에 따릅니다. 이 데모에서는 결제가 이루어지지 않습니다."] },
  CONTACT_INQUIRY: { vi: ["Liên hệ & tư vấn", "Kênh liên hệ chính thức chưa được công bố trong bản demo.", "Vui lòng không gửi thông tin cá nhân qua bản xem trước. Chủ cửa hàng sẽ cung cấp kênh liên hệ chính thức trước khi mở bán."], ko: ["문의 및 상담", "이 데모에는 공식 연락처가 게시되지 않았습니다.", "미리보기 화면에 개인정보를 보내지 마세요. 정식 오픈 전에 공식 문의 채널이 안내됩니다."] },
  FLOWER_CARE_DEFAULT: { vi: ["Chăm sóc hoa", "Gợi ý chăm hoa cơ bản trong bản demo.", "Thay nước sạch, cắt chéo gốc cành và đặt hoa ở nơi mát, tránh nắng trực tiếp."], ko: ["꽃 관리", "데모에서 제공하는 기본 관리 팁입니다.", "물을 갈고 줄기 끝을 사선으로 자른 뒤 직사광선을 피해 서늘한 곳에 두세요."] },
  FRESHNESS_SUBSTITUTION_DEFAULT: { vi: ["Độ tươi & thay thế hoa", "Cần xác nhận với chủ cửa hàng trước khi áp dụng.", "Hoa theo mùa và tính chất thủ công có thể làm hình ảnh minh họa khác thành phẩm. Quy trình thay thế hoa thực tế sẽ được công bố khi mở bán."], ko: ["신선도 및 꽃 대체", "정식 적용 전 운영자 확인이 필요합니다.", "계절과 수작업 특성에 따라 예시 이미지와 실제 꽃다발이 다를 수 있습니다. 꽃 대체 절차는 정식 운영 시 공지됩니다."] },
} as const;

export function getReviewPolicies(locale: Locale): PublishedCommercialContent[] {
  return (Object.entries(policyCopy) as [CommercialContentCode, typeof policyCopy[CommercialContentCode]][]).map(([code, copy], index) => {
    const [title, summary, body] = copy[locale];
    return { id: `review-policy-${code}`, code, sortOrder: index, content: { title, summary, body } };
  });
}

export function getReviewCheckoutOptions(locale: Locale): CheckoutOptions {
  return {
    deliveryEnabled: true, pickupEnabled: true, sameDayEnabled: false, sameDayCutoff: null,
    deliveryHelp: locale === "vi" ? "Khu vực và phí minh họa; không có giao hàng thật." : "배송 지역과 요금은 예시이며 실제 배송은 이루어지지 않습니다.",
    pickup: {
      name: locale === "vi" ? "Điểm nhận minh họa" : "예시 방문 수령 지점",
      address: locale === "vi" ? "Không phải địa chỉ cửa hàng thật" : "실제 매장 주소가 아닙니다",
      hours: locale === "vi" ? "Chưa xác nhận" : "미확정",
    },
    zones: [{ id: "review-zone", code: "REVIEW", name: locale === "vi" ? "Khu vực minh họa" : "예시 지역", help: null,
      feeAmount: 30_000, sameDayEligible: false,
      areas: [{ id: "review-area", code: "REVIEW_AREA", name: locale === "vi" ? "Địa chỉ demo" : "예시 주소" }],
    }],
    windows: [{ id: "review-window", code: "REVIEW_WINDOW", label: locale === "vi" ? "Khung giờ minh họa" : "예시 시간대",
      help: null, startTime: "09:00", endTime: "17:00", sameDayEligible: false }],
    paymentMethods: { bankTransfer: false, cash: true, cashDelivery: true, cashPickup: true },
  };
}

export function getReviewNavigation(locale: Locale): StorefrontNavigationItem[] {
  const entries = locale === "vi"
    ? [["home", "Trang chủ", "/#top"], ["catalog", "Bộ sưu tập", "/flowers"], ["occasions", "Theo dịp", "/#occasions"], ["builder", "Tạo bó hoa", "/create-bouquet"], ["about", "Về Luméa", "/about"], ["contact", "Liên hệ", "/contact"]]
    : [["home", "홈", "/#top"], ["catalog", "컬렉션", "/flowers"], ["occasions", "상황별", "/#occasions"], ["builder", "꽃다발 만들기", "/create-bouquet"], ["about", "Luméa 소개", "/about"], ["contact", "문의", "/contact"]];
  return entries.map(([stableCode, label, to], index) => ({
    id: `review-nav-${stableCode}`, stableCode, label, to,
    destinationType: "HOME", categorySlug: null, externalUrl: null, sortOrder: index, external: false,
  }));
}

export function getReviewBuilder(locale: Locale): BouquetBuilderCatalog {
  return {
    flowers: flowerStems.map((stem, index) => ({ id: `review-flower-${stem.id}`, stableCode: stem.id,
      name: locale === "vi" ? ({ "garden-rose": "Hồng vườn", "pink-tulip": "Tulip hồng", "white-rose": "Hồng trắng", "pink-calla": "Calla hồng", ranunculus: "Mao lương", hydrangea: "Cẩm tú cầu", chrysanthemum: "Cúc", "red-lily": "Ly đỏ" } as Record<string, string>)[stem.id] : ({ "garden-rose": "가든 로즈", "pink-tulip": "핑크 튤립", "white-rose": "화이트 로즈", "pink-calla": "핑크 칼라", ranunculus: "라넌큘러스", hydrangea: "수국", chrysanthemum: "국화", "red-lily": "레드 릴리" } as Record<string, string>)[stem.id],
      description: locale === "vi" ? "Hoa minh họa" : "예시 꽃", imageUrl: assets[stem.image], imageAlt: locale === "vi" ? "Ảnh hoa minh họa" : "예시 꽃 이미지",
      pricePerStem: stem.pricePerStem, availability: stem.availability, sortOrder: index })),
    wrappingTypes: wrappingTypes.map((wrap, index) => ({ id: `review-wrap-${wrap.id}`, stableCode: wrap.id,
      name: locale === "vi" ? "Giấy gói minh họa" : "예시 포장지", description: "", priceModifier: wrap.priceModifier,
      compatibleVariantIds: wrap.compatibleVariantIds.map((id) => `review-wrap-variant-${id}`), compatibilityPriceModifiers: {}, sortOrder: index })),
    wrappingVariants: wrappingVariants.map((variant, index) => ({ id: `review-wrap-variant-${variant.id}`, stableCode: variant.id,
      name: variant.id, priceModifier: variant.priceModifier, swatch: variant.swatch, sortOrder: index })),
  };
}
