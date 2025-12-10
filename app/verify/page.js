"use client";

import { Suspense } from "react";
import VerifyComponent from "./verify-content";

export default function VerifyPageWrapper() {
  return (
    <Suspense fallback={<div className="loading-center">جاري التحميل...</div>}>
      <VerifyComponent />
    </Suspense>
  );
}

