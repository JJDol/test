"use client";

import { useTranslations } from "next-intl";
import ProtectedPageWrapper from "@/components/auth/protected-page-wrapper";
import { VariablesContent } from "@/components/variables/variables-content";

export default function VariablesPage() {
    const t = useTranslations("variables");
    return (
        <ProtectedPageWrapper loadingMessage={t("loadingVariables")}>
            <VariablesContent />
        </ProtectedPageWrapper>
    )
}