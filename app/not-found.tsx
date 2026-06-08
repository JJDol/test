"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full p-4 text-center">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-2">{t("title")}</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        {t("description")}
      </p>
      <Button asChild>
        <Link href="/">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("goHome")}
        </Link>
      </Button>
    </div>
  );
}
