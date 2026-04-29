import * as React from "react";
import { cn } from "@/lib/utils";
import {
  avatarColorFor,
  avatarForegroundFor,
  initialsFrom,
} from "@/lib/team/avatar";

/**
 * Sizes follow a small/medium/large scale. The numeric value is the Tailwind
 * class size token (so `md` = `h-10 w-10`).
 */
export type UserAvatarSize = "xs" | "sm" | "md" | "lg";

const SIZE_CLASSES: Record<
  UserAvatarSize,
  { box: string; text: string; ring: string }
> = {
  xs: { box: "h-6 w-6", text: "text-[10px]", ring: "ring-[1.5px]" },
  sm: { box: "h-8 w-8", text: "text-xs", ring: "ring-2" },
  md: { box: "h-10 w-10", text: "text-sm", ring: "ring-2" },
  lg: { box: "h-12 w-12", text: "text-base", ring: "ring-2" },
};

export interface UserLike {
  id: string;
  name?: string | null;
  email?: string | null;
}

interface UserAvatarProps {
  user: UserLike;
  size?: UserAvatarSize;
  className?: string;
  /** Render a subtle ring around the avatar — useful inside a stack. */
  ringed?: boolean;
  /** Override the tooltip text. Defaults to "Name · email". */
  title?: string;
  /**
   * Suppress the native `title` tooltip. Useful when the avatar is embedded
   * in a richer custom tooltip (e.g. the UserAvatarStack hover popup).
   */
  noTitle?: boolean;
}

export function UserAvatar({
  user,
  size = "md",
  className,
  ringed = false,
  title,
  noTitle = false,
}: UserAvatarProps) {
  const sizes = SIZE_CLASSES[size];
  const bgColor = avatarColorFor(user.id || user.email || user.name || "");
  const fgColor = avatarForegroundFor(bgColor);
  const initials = initialsFrom(user.name, user.email);
  const derivedTooltip =
    [user.name, user.email].filter(Boolean).join(" · ") || undefined;
  const tooltip = title ?? derivedTooltip;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        sizes.box,
        sizes.text,
        ringed && `${sizes.ring} ring-background`,
        className
      )}
      style={{ backgroundColor: bgColor, color: fgColor }}
      title={noTitle ? undefined : tooltip}
      aria-label={tooltip}
    >
      {initials}
    </span>
  );
}

interface UserAvatarStackProps {
  users: UserLike[];
  /** Maximum number of avatars to render before collapsing into a +N chip. */
  max?: number;
  size?: UserAvatarSize;
  className?: string;
  /**
   * Optional set of user ids that should get a small leader mark (star icon
   * overlay) on their avatar. Used on the project overview to mark the
   * project leader.
   */
  leaderIds?: Set<string>;
  /** Rendered when `users` is empty. */
  emptyLabel?: React.ReactNode;
}

export function UserAvatarStack({
  users,
  max = 6,
  size = "md",
  className,
  leaderIds,
  emptyLabel,
}: UserAvatarStackProps) {
  if (!users || users.length === 0) {
    if (emptyLabel === undefined) return null;
    return <span className="text-sm text-muted-foreground">{emptyLabel}</span>;
  }

  const visible = users.slice(0, max);
  const overflow = users.length - visible.length;
  const sizes = SIZE_CLASSES[size];

  // Overlap amount — tuned so initials remain legible.
  const overlap =
    size === "xs" ? "-ml-1.5" : size === "sm" ? "-ml-2" : "-ml-2.5";

  return (
    <div className={cn("flex items-center", className)}>
      {visible.map((u, i) => {
        const isLeader = leaderIds?.has(u.id);
        const displayName = u.name || u.email || "Unknown";
        return (
          <div
            key={u.id || `${u.email}-${i}`}
            className={cn(
              "group relative transition-transform duration-150 ease-out hover:scale-110",
              i > 0 && overlap
            )}
            style={{ zIndex: visible.length - i }}
          >
            {/* Hovered avatar should overlap everything else in the stack */}
            <div className="relative group-hover:z-30">
              <UserAvatar user={u} size={size} ringed noTitle />
              {isLeader && (
                <span
                  aria-hidden
                  className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[8px] text-white ring-[1.5px] ring-background"
                  title="Project leader"
                >
                  ★
                </span>
              )}
            </div>

            {/* Hover popup with full name + email */}
            <div
              role="tooltip"
              className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 scale-95 whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-popover-foreground opacity-0 shadow-md transition-all duration-150 group-hover:scale-100 group-hover:opacity-100"
            >
              <div className="text-xs font-medium">{displayName}</div>
              {u.email && u.email !== displayName && (
                <div className="text-[11px] text-muted-foreground">
                  {u.email}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {overflow > 0 && (
        <div className={cn("relative", overlap)} style={{ zIndex: 0 }}>
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground ring-2 ring-background",
              sizes.box,
              sizes.text
            )}
            title={`${overflow} more`}
            aria-label={`${overflow} more`}
          >
            +{overflow}
          </span>
        </div>
      )}
    </div>
  );
}
