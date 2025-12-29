"use client";

import ProtectedPageWrapper from "@/components/auth/protected-page-wrapper";
import { VariablesContent } from "@/components/variables/variables-content";

export default function VariablesPage() {
    return (
        <ProtectedPageWrapper loadingMessage = "Loading variables...">
            <VariablesContent />
        </ProtectedPageWrapper>
    )
}