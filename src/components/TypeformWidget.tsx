"use client";

import { Widget } from "@typeform/embed-react";

type TypeformWidgetProps = {
  formId: string;
};

export function TypeformWidget({ formId }: TypeformWidgetProps) {
  return (
    <div className="h-[520px] overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <Widget
        id={formId}
        style={{ width: "100%", height: "100%" }}
        hideHeaders
        hideFooter
      />
    </div>
  );
}
