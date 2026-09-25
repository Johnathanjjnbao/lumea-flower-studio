import { useEffect } from "react";

export function useDocumentMetadata(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    const descriptionElement = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    descriptionElement?.setAttribute("content", description);
  }, [description, title]);
}
