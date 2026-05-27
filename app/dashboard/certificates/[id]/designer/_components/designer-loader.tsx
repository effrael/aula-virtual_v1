"use client";

import dynamic from "next/dynamic";

const TemplateDesigner = dynamic(
  () =>
    import("./template-designer").then((m) => m.TemplateDesigner),
  { ssr: false }
);

type Props = {
  templateId: string;
  pdfUrl: string;
  pdfmeTemplate: Record<string, unknown>;
};

export function DesignerLoader(props: Props) {
  return <TemplateDesigner {...props} />;
}
