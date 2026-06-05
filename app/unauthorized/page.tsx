import { getTranslations } from "next-intl/server";

export default async function Unauthorized() {
    const t = await getTranslations("unauthorized");
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
        <p className="text-center mb-6">
          {t("description")}
        </p>
        <p className="text-sm text-gray-500">
          {t("contactAdmin")}
        </p>
      </div>
    );
  }