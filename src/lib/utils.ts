import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getShortOrderId(id: string): string {
  if (!id) return "-";
  return `ORD#${id.substring(id.length - 4)}`;
}
