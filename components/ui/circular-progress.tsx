"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}

/**
 * CircularProgress - Donut/Ring style progress indicator
 * 
 * Displays progress as a circular ring with percentage in the center.
 * Colors follow the same logic as the linear Progress component:
 * - Red for < 50%
 * - Yellow/Amber for 50-99%
 * - Green for 100%
 */
export function CircularProgress({
  value,
  size = 100,
  strokeWidth = 8,
  className,
  showLabel = true,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  // Get color based on progress value
  const getProgressColor = () => {
    if (value >= 100) return "#22c55e"; // green-500
    if (value >= 50) return "#d4a017"; // amber/golden color matching the design
    return "#ef4444"; // red-500
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle (track) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-300 dark:text-gray-600"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getProgressColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
      {/* Center label */}
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            "font-semibold text-foreground",
            size <= 80 ? "text-sm" : "text-lg"
          )}>
            {Math.round(value)}%
          </span>
        </div>
      )}
    </div>
  );
}
