"use client";

import { Suspense } from "react";
import { SetupMfaClient } from "./setup-mfa-client";

export default function SetupMfaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading…</div>}>
      <SetupMfaClient />
    </Suspense>
  );
}
