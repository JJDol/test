"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

interface PasswordResetButtonProps {
  isSubmitting: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "submit" | "button";
  variant?: "full" | "compact";
  className?: string;
}

export function PasswordResetButton({ 
  isSubmitting, 
  disabled, 
  onClick, 
  type = "button",
  variant = "full",
  className = ""
}: PasswordResetButtonProps) {
  const t = useTranslations("auth");
  const baseClasses = "bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = variant === "full" 
    ? "w-full" 
    : "w-auto px-6";

  const buttonClasses = `${baseClasses} ${variantClasses} ${className}`;

  return (
    <Button
      type={type}
      disabled={disabled || isSubmitting}
      className={buttonClasses}
      onClick={onClick}
    >
      {isSubmitting ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          {t("sendingResetLink")}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          {t("sendResetLink")}
        </div>
      )}
    </Button>
  );
}
