import { getTranslations } from "next-intl/server";

export default async function Unauthorized() {
    const t = await getTranslations("unauthorized");
    return (
      <div className="flex-1 flex flex-col items-center justify-center w-full p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          {t("description")}
        </p>
        <p className="text-sm text-muted-foreground max-w-md">
          {t("contactAdmin")}
        </p>
      </div>
    );
  }
