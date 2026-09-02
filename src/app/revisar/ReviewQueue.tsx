"use client";

import { useState } from "react";
import type { Analyte } from "@/db/schema";
import type { ReviewItem } from "@/lib/queries";
import { ReviewRow } from "./ReviewRow";

export function ReviewQueue({
  items,
  analytes,
}: {
  items: ReviewItem[];
  analytes: Analyte[];
}) {
  const [resolved, setResolved] = useState(0);
  const remaining = items.length - resolved;

  return (
    <>
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted">
          {remaining > 0
            ? `${remaining} ${remaining === 1 ? "resultado aguardando" : "resultados aguardando"}`
            : "Fila concluída"}
        </p>
        {resolved > 0 && (
          <p className="text-sm text-accent">
            {resolved} {resolved === 1 ? "resolvido" : "resolvidos"} agora
          </p>
        )}
      </div>

      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <ReviewRow
            key={item.id}
            item={item}
            analytes={analytes}
            onResolved={() => setResolved((n) => n + 1)}
          />
        ))}
      </ul>
    </>
  );
}
