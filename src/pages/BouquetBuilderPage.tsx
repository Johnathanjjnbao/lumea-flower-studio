import { useEffect, useMemo, useRef } from "react";
import { AssetImage } from "../components/AssetImage";
import { PageFrame } from "../components/PageFrame";
import { flowerStems, wrappingTypes } from "../features/bouquetBuilder/data";
import { MAX_STEMS_PER_FLOWER } from "../features/bouquetBuilder/pricing";
import type { FlowerStem, WrappingTypeId, WrappingVariantId } from "../features/bouquetBuilder/types";
import { useBouquetBuilder } from "../features/bouquetBuilder/useBouquetBuilder";
import { useBuilderStepNavigation, type BuilderStepId } from "../features/bouquetBuilder/useBuilderStepNavigation";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { useImagePipeline } from "../hooks/useImagePipeline";
import { formatMessage, useI18n } from "../i18n";
import { formatVnd } from "../utils/product";

const previewPositions = [
  ["50%", "18%", "-7deg"], ["30%", "27%", "-16deg"], ["68%", "28%", "12deg"],
  ["42%", "39%", "8deg"], ["60%", "42%", "-10deg"], ["23%", "48%", "-5deg"],
  ["76%", "50%", "16deg"], ["34%", "59%", "13deg"], ["57%", "61%", "-7deg"],
  ["18%", "65%", "-14deg"], ["72%", "68%", "9deg"], ["48%", "73%", "3deg"],
] as const;

function availabilityCopy(flower: FlowerStem, t: ReturnType<typeof useI18n>["t"]) {
  if (flower.availability === "UNAVAILABLE") return t.builder.unavailableNote;
  if (flower.availability === "SEASONAL") return t.builder.seasonalNote;
  return t.product.availability.AVAILABLE;
}

export function BouquetBuilderPage() {
  const { t } = useI18n();
  const pageRef = useRef<HTMLDivElement>(null);
  const flowersSectionRef = useRef<HTMLElement>(null);
  const wrappingSectionRef = useRef<HTMLElement>(null);
  const previewSectionRef = useRef<HTMLElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);
  const builder = useBouquetBuilder();
  const stepTargets = useMemo(() => [
    { id: "flowers" as const, ref: flowersSectionRef },
    { id: "wrapping" as const, ref: wrappingSectionRef },
    { id: "preview" as const, ref: previewSectionRef },
  ], []);
  const { activeStep, scrollToStep } = useBuilderStepNavigation(stepTargets);
  const refreshKey = `${builder.selectedFlowers.map((flower) => `${flower.id}:${builder.quantities[flower.id]}`).join("|")}-${builder.wrappingType.id}-${builder.wrappingVariant.id}`;

  useDocumentMetadata(t.meta.builderTitle, t.meta.builderDescription);
  useImagePipeline(pageRef, {
    observe: "images",
    prioritySelector: ".builder-intro",
    preloadMargin: "700px 0px",
    refreshKey,
  });

  useEffect(() => {
    if (builder.completedResult) confirmationRef.current?.focus({ preventScroll: true });
  }, [builder.completedResult]);

  const previewFlowers = useMemo(() => builder.selectedFlowers.flatMap((flower) => {
    const visibleCount = Math.min(3, Math.max(1, Math.ceil(builder.quantities[flower.id] / 4)));
    return Array.from({ length: visibleCount }, (_, index) => ({ flower, key: `${flower.id}-${index}` }));
  }).slice(0, previewPositions.length), [builder.quantities, builder.selectedFlowers]);

  const wrappingName = t.builder.wrapTypes[builder.wrappingType.id].name;
  const variantName = t.builder.wrapVariants[builder.wrappingVariant.id];

  return (
    <PageFrame pageRef={pageRef}>
      <section className="builder-page" aria-labelledby="builder-title">
        <header className="builder-intro">
          <div className="section-shell builder-intro__inner">
            <div>
              <p className="eyebrow"><span aria-hidden="true">01</span>{t.builder.eyebrow}</p>
              <h1 id="builder-title">{t.builder.titleOne}<br /><em>{t.builder.titleTwo}</em></h1>
            </div>
            <div className="builder-intro__copy">
              <p>{t.builder.intro}</p>
              <nav className="builder-step-nav" aria-label={t.builder.stepsAria}>
                <ol className="builder-steps">
                  {t.builder.steps.map((step, index) => {
                    const stepId = (["flowers", "wrapping", "preview"] as const)[index] as BuilderStepId;
                    return (
                      <li key={stepId}>
                        <button type="button" data-active={activeStep === stepId} aria-current={activeStep === stepId ? "step" : undefined} onClick={() => scrollToStep(stepId)}>
                          <span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </div>
          </div>
        </header>

        <div className="section-shell builder-workspace">
          <div className="builder-controls">
            <section ref={flowersSectionRef} className="builder-control-section" id="builder-flowers" tabIndex={-1} aria-labelledby="flower-table-title">
              <div className="builder-section-heading">
                <p className="eyebrow">{t.builder.flowersEyebrow}</p>
                <h2 id="flower-table-title">{t.builder.flowersTitle}</h2>
                <p>{t.builder.flowersIntro}</p>
              </div>

              <div className="stem-grid">
                {flowerStems.map((flower) => {
                  const copy = t.builder.flowers[flower.id];
                  const quantity = builder.quantities[flower.id];
                  const unavailable = flower.availability === "UNAVAILABLE";
                  const atMaximum = quantity >= MAX_STEMS_PER_FLOWER;
                  return (
                    <article className="stem-card" data-selected={quantity > 0} data-unavailable={unavailable} key={flower.id}>
                      <figure className="stem-card__image">
                        <AssetImage asset={flower.image} alt={copy.alt} loading="lazy" />
                        {quantity > 0 && <span>{t.builder.selected} · {quantity}</span>}
                      </figure>
                      <div className="stem-card__body">
                        <div className="stem-card__topline">
                          <p>{availabilityCopy(flower, t)}</p>
                          <strong>{formatMessage(t.builder.perStem, { price: formatVnd(flower.pricePerStem) })}</strong>
                        </div>
                        <h3>{copy.name}</h3>
                        <p className="stem-card__description">{copy.description}</p>
                        <div className="quantity-control" aria-label={formatMessage(t.builder.quantity, { name: copy.name, count: quantity })}>
                          <button type="button" disabled={quantity === 0 || unavailable} onClick={() => builder.setQuantity(flower.id, quantity - 1)} aria-label={formatMessage(t.builder.decrease, { name: copy.name })}>−</button>
                          <output aria-live="polite">{quantity}</output>
                          <button type="button" disabled={unavailable || atMaximum} onClick={() => builder.setQuantity(flower.id, quantity + 1)} aria-label={formatMessage(t.builder.increase, { name: copy.name })}>＋</button>
                        </div>
                        {atMaximum && <p className="stem-card__maximum" role="status">{t.builder.maximum}</p>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section ref={wrappingSectionRef} className="builder-control-section builder-wrapping" id="builder-wrapping" tabIndex={-1} aria-labelledby="wrapping-title">
              <div className="builder-section-heading">
                <p className="eyebrow">{t.builder.wrappingEyebrow}</p>
                <h2 id="wrapping-title">{t.builder.wrappingTitle}</h2>
                <p>{t.builder.wrappingIntro}</p>
              </div>

              <fieldset className="wrap-options">
                <legend>{t.builder.wrapTypeLegend}</legend>
                <div className="wrap-type-grid">
                  {wrappingTypes.map((option) => {
                    const copy = t.builder.wrapTypes[option.id];
                    return (
                      <label data-selected={builder.wrappingType.id === option.id} key={option.id}>
                        <input type="radio" name="wrapping-type" value={option.id} checked={builder.wrappingType.id === option.id} onChange={() => builder.selectWrappingType(option.id as WrappingTypeId)} />
                        <span className="wrap-type-card__marker" aria-hidden="true" />
                        <strong>{copy.name}</strong>
                        <small>{copy.description}</small>
                        <em>{option.priceModifier ? formatMessage(t.builder.addPrice, { price: formatVnd(option.priceModifier) }) : t.builder.included}</em>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="wrap-variants">
                <legend>{t.builder.wrapColorLegend}</legend>
                <div>
                  {builder.compatibleVariants.map((variant) => (
                    <label data-selected={builder.wrappingVariant.id === variant.id} key={variant.id}>
                      <input type="radio" name="wrapping-variant" value={variant.id} checked={builder.wrappingVariant.id === variant.id} onChange={() => builder.selectWrappingVariant(variant.id as WrappingVariantId)} />
                      <i style={{ backgroundColor: variant.swatch }} aria-hidden="true" />
                      <span>{t.builder.wrapVariants[variant.id]}</span>
                      {variant.priceModifier > 0 && <small>{formatMessage(t.builder.addPrice, { price: formatVnd(variant.priceModifier) })}</small>}
                    </label>
                  ))}
                </div>
              </fieldset>
            </section>
          </div>

          <aside ref={previewSectionRef} className="builder-preview-panel" id="builder-preview" tabIndex={-1} aria-labelledby="preview-title">
            <div className="builder-preview-heading">
              <p>{t.builder.previewEyebrow}</p>
              <h2 id="preview-title">{t.builder.previewTitle}</h2>
            </div>

            <div className="bouquet-preview" data-wrap={builder.wrappingType.id} style={{ "--wrap-color": builder.wrappingVariant.swatch } as React.CSSProperties} role="img" aria-label={t.builder.previewAria}>
              <div className="bouquet-preview__paper" aria-hidden="true" />
              {previewFlowers.length ? (
                <div className="bouquet-preview__flowers" aria-hidden="true">
                  {previewFlowers.map(({ flower, key }, index) => {
                    const [left, top, rotation] = previewPositions[index];
                    return <AssetImage key={key} asset={flower.image} alt="" style={{ left, top, transform: `translate(-50%, -50%) rotate(${rotation})` }} loading="lazy" />;
                  })}
                </div>
              ) : (
                <div className="bouquet-preview__empty"><span aria-hidden="true">L</span><strong>{t.builder.emptyTitle}</strong><p>{t.builder.emptyText}</p></div>
              )}
              <div className="bouquet-preview__ribbon" aria-hidden="true" />
            </div>

            <div className="builder-summary">
              <h3>{t.builder.summaryTitle}</h3>
              <div className="builder-summary__selection">
                <span>{t.builder.selectedFlowers}</span>
                {builder.selectedFlowers.length ? (
                  <ul>{builder.selectedFlowers.map((flower) => <li key={flower.id}><span>{t.builder.flowers[flower.id].name}</span><strong>× {builder.quantities[flower.id]}</strong></li>)}</ul>
                ) : <p>{t.builder.noFlowers}</p>}
              </div>
              <dl>
                <div><dt>{t.builder.wrapping}</dt><dd>{wrappingName} · {variantName}</dd></div>
                <div><dt>{t.builder.totalStems}</dt><dd>{builder.pricing.totalStemCount}</dd></div>
                <div><dt>{t.builder.flowerSubtotal}</dt><dd>{formatVnd(builder.pricing.flowerSubtotal)}</dd></div>
                <div><dt>{t.builder.wrappingPrice}</dt><dd>{formatVnd(builder.pricing.wrappingPrice)}</dd></div>
                <div className="builder-summary__total"><dt>{t.builder.total}</dt><dd aria-live="polite">{formatVnd(builder.pricing.totalPrice)}</dd></div>
              </dl>
              <div className="builder-summary__actions">
                <button className="button button--solid" type="button" disabled={!builder.isValid} onClick={() => builder.complete()}>{t.builder.complete}</button>
                <button className="builder-reset" type="button" onClick={builder.reset}>{t.builder.reset}</button>
              </div>
              {!builder.isValid && <p className="builder-summary__hint">{t.builder.completeHint}</p>}
              {builder.completedResult && (
                <div ref={confirmationRef} className="builder-confirmation" role="status" tabIndex={-1} aria-label={t.builder.confirmationAria}>
                  <strong>{t.builder.confirmationTitle}</strong>
                  <p>{t.builder.confirmationText}</p>
                  <dl>
                    <div><dt>{t.builder.totalStems}</dt><dd>{builder.completedResult.totalStemCount}</dd></div>
                    <div><dt>{t.builder.wrapping}</dt><dd>{wrappingName} · {variantName}</dd></div>
                    <div><dt>{t.builder.total}</dt><dd>{formatVnd(builder.completedResult.totalPrice)}</dd></div>
                  </dl>
                  <button
                    type="button"
                    onClick={() => {
                      builder.edit();
                      window.requestAnimationFrame(() => scrollToStep("flowers"));
                    }}
                  >
                    {t.builder.edit}
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </PageFrame>
  );
}
