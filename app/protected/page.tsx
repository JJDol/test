"use client";

import MainPart from "@/components/ui/main-part";
import ProtectedPageWrapper from "@/components/auth/protected-page-wrapper";

export default function ProtectedPage() {
   return (
    <ProtectedPageWrapper loadingMessage="Loading...">
      <div className="flex-1 w-full flex gap-12">
        <MainPart />
      </div>
    </ProtectedPageWrapper>
  );
}