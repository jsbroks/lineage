import type React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  type SelectProps,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";

export enum Colors {
  Red = "red",
  Orange = "orange",
  Amber = "amber",
  Yellow = "yellow",
  Lime = "lime",
  Green = "green",
  Emerald = "emerald",
  Teal = "teal",
  Cyan = "cyan",
  Sky = "sky",
  Blue = "blue",
  Indigo = "indigo",
  Violet = "violet",
  Purple = "purple",
  Fuchsia = "fuchsia",
  Pink = "pink",
  Rose = "rose",
  Slate = "slate",
  Gray = "gray",
  Zinc = "zinc",
  Neutral = "neutral",
  Stone = "stone",
  Taupe = "taupe",
  Mauve = "mauve",
  Mist = "mist",
  Olive = "olive",
}

type ColorClasses = {
  text: string;
  bg: string;
  border: string;
  ring: string;
  fill: string;
  stroke: string;
};

export const colorClasses: Record<Colors, ColorClasses> = {
  [Colors.Red]: {
    text: "text-red-600",
    bg: "bg-red-500/20",
    border: "border-red-500",
    ring: "ring-red-500",
    fill: "fill-red-500",
    stroke: "stroke-red-500",
  },
  [Colors.Green]: {
    text: "text-green-600",
    bg: "bg-green-500/20",
    border: "border-green-500",
    ring: "ring-green-500",
    fill: "fill-green-500",
    stroke: "stroke-green-500",
  },
  [Colors.Blue]: {
    text: "text-blue-600",
    bg: "bg-blue-500/20",
    border: "border-blue-500",
    ring: "ring-blue-500",
    fill: "fill-blue-500",
    stroke: "stroke-blue-500",
  },
  [Colors.Yellow]: {
    text: "text-yellow-600",
    bg: "bg-yellow-500/20",
    border: "border-yellow-500",
    ring: "ring-yellow-500",
    fill: "fill-yellow-500",
    stroke: "stroke-yellow-500",
  },
  [Colors.Purple]: {
    text: "text-purple-600",
    bg: "bg-purple-500/20",
    border: "border-purple-500",
    ring: "ring-purple-500",
    fill: "fill-purple-500",
    stroke: "stroke-purple-500",
  },
  [Colors.Orange]: {
    text: "text-orange-600",
    bg: "bg-orange-500/20",
    border: "border-orange-500",
    ring: "ring-orange-500",
    fill: "fill-orange-500",
    stroke: "stroke-orange-500",
  },
  [Colors.Pink]: {
    text: "text-pink-600",
    bg: "bg-pink-500/20",
    border: "border-pink-500",
    ring: "ring-pink-500",
    fill: "fill-pink-500",
    stroke: "stroke-pink-500",
  },
  [Colors.Rose]: {
    text: "text-rose-600",
    bg: "bg-rose-500/20",
    border: "border-rose-500",
    ring: "ring-rose-500",
    fill: "fill-rose-500",
    stroke: "stroke-rose-500",
  },
  [Colors.Slate]: {
    text: "text-slate-600",
    bg: "bg-slate-500/20",
    border: "border-slate-500",
    ring: "ring-slate-500",
    fill: "fill-slate-500",
    stroke: "stroke-slate-500",
  },
  [Colors.Gray]: {
    text: "text-gray-600",
    bg: "bg-gray-500/20",
    border: "border-gray-500",
    ring: "ring-gray-500",
    fill: "fill-gray-500",
    stroke: "stroke-gray-500",
  },
  [Colors.Zinc]: {
    text: "text-zinc-600",
    bg: "bg-zinc-500/20",
    border: "border-zinc-500",
    ring: "ring-zinc-500",
    fill: "fill-zinc-500",
    stroke: "stroke-zinc-500",
  },
  [Colors.Neutral]: {
    text: "text-neutral-600",
    bg: "bg-neutral-500/20",
    border: "border-neutral-500",
    ring: "ring-neutral-500",
    fill: "fill-neutral-500",
    stroke: "stroke-neutral-500",
  },
  [Colors.Stone]: {
    text: "text-stone-600",
    bg: "bg-stone-500/20",
    border: "border-stone-500",
    ring: "ring-stone-500",
    fill: "fill-stone-500",
    stroke: "stroke-stone-500",
  },
  [Colors.Taupe]: {
    text: "text-taupe-600",
    bg: "bg-taupe-500/20",
    border: "border-taupe-500",
    ring: "ring-taupe-500",
    fill: "fill-taupe-500",
    stroke: "stroke-taupe-500",
  },
  [Colors.Mauve]: {
    text: "text-mauve-600",
    bg: "bg-mauve-500/20",
    border: "border-mauve-500",
    ring: "ring-mauve-500",
    fill: "fill-mauve-500",
    stroke: "stroke-mauve-500",
  },
  [Colors.Mist]: {
    border: "border-mist-500",
    ring: "ring-mist-500",
    fill: "fill-mist-500",
    stroke: "stroke-mist-500",
    text: "text-mist-600",
    bg: "bg-mist-500/20",
  },
  [Colors.Amber]: {
    text: "text-amber-600",
    bg: "bg-amber-500/20",
    border: "border-amber-500",
    ring: "ring-amber-500",
    fill: "fill-amber-500",
    stroke: "stroke-amber-500",
  },
  [Colors.Lime]: {
    text: "text-lime-600",
    bg: "bg-lime-500/20",
    border: "border-lime-500",
    ring: "ring-lime-500",
    fill: "fill-lime-500",
    stroke: "stroke-lime-500",
  },
  [Colors.Emerald]: {
    text: "text-emerald-600",
    bg: "bg-emerald-500/20",
    border: "border-emerald-500",
    ring: "ring-emerald-500",
    fill: "fill-emerald-500",
    stroke: "stroke-emerald-500",
  },
  [Colors.Teal]: {
    text: "text-teal-600",
    bg: "bg-teal-500/20",
    border: "border-teal-500",
    ring: "ring-teal-500",
    fill: "fill-teal-500",
    stroke: "stroke-teal-500",
  },
  [Colors.Cyan]: {
    text: "text-cyan-600",
    bg: "bg-cyan-500/20",
    border: "border-cyan-500",
    ring: "ring-cyan-500",
    fill: "fill-cyan-500",
    stroke: "stroke-cyan-500",
  },
  [Colors.Sky]: {
    text: "text-sky-600",
    bg: "bg-sky-500/20",
    border: "border-sky-500",
    ring: "ring-sky-500",
    fill: "fill-sky-500",
    stroke: "stroke-sky-500",
  },
  [Colors.Indigo]: {
    text: "text-indigo-600",
    bg: "bg-indigo-500/20",
    border: "border-indigo-500",
    ring: "ring-indigo-500",
    fill: "fill-indigo-500",
    stroke: "stroke-indigo-500",
  },
  [Colors.Violet]: {
    text: "text-violet-600",
    bg: "bg-violet-500/20",
    border: "border-violet-500",
    ring: "ring-violet-500",
    fill: "fill-violet-500",
    stroke: "stroke-violet-500",
  },
  [Colors.Fuchsia]: {
    text: "text-fuchsia-600",
    bg: "bg-fuchsia-500/20",
    border: "border-fuchsia-500",
    ring: "ring-fuchsia-500",
    fill: "fill-fuchsia-500",
    stroke: "stroke-fuchsia-500",
  },
  [Colors.Olive]: {
    text: "text-olive-600",
    bg: "bg-olive-500/20",
    border: "border-olive-500",
    ring: "ring-olive-500",
    fill: "fill-olive-500",
    stroke: "stroke-olive-500",
  },
};

export const getColorClasses = (color?: Colors | null | string) => {
  if (!color) return colorClasses[Colors.Neutral];
  return colorClasses[color as Colors];
};

export const ColorSelector: React.FC<React.PropsWithChildren & SelectProps> = ({
  children,
  ...props
}) => {
  return (
    <Select {...props}>
      <SelectTrigger className="w-full">{children}</SelectTrigger>
      <SelectContent>
        {Object.entries(Colors).map(([name, color]) => (
          <SelectItem
            key={color}
            value={color}
            className="flex items-center gap-2"
          >
            <div
              className={cn(
                "size-4 h-5 w-full rounded-sm px-2 text-sm hover:text-inherit",
                getColorClasses(color).text,
                getColorClasses(color).bg,
              )}
            >
              {name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
