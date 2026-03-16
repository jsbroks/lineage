import {
  BadgeQuestionMark,
  Bed,
  Box,
  Leaf,
  Truck,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  box: Box,
  bed: Bed,
  leaf: Leaf,
  truck: Truck,
};

export const Icon: React.FC<{ icon: string; className?: string }> = ({
  icon,
  className,
}) => {
  const IconComponent = icons[icon];
  if (!IconComponent) return <BadgeQuestionMark />;
  return <IconComponent className={className} />;
};
