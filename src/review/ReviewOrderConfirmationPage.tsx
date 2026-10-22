import { Link } from "react-router-dom";
import { PageFrame } from "../components/PageFrame";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { useI18n } from "../i18n";

export function ReviewOrderConfirmationPage() {
  const { t, path } = useI18n();
  useDocumentMetadata(t.meta.confirmationTitle, t.meta.confirmationDescription);
  return <PageFrame><section className="confirmation-missing section-shell section-space" aria-labelledby="confirmation-missing-title">
    <p className="eyebrow">LUMÉA · REVIEW MODE</p>
    <h1 id="confirmation-missing-title">{t.confirmation.missingTitle}</h1>
    <p>{t.confirmation.missingText}</p>
    <Link className="button button--solid" to={path("/")}>{t.confirmation.returnHome}</Link>
  </section></PageFrame>;
}
