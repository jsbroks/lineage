import { HugeiconsIcon } from "@hugeicons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type SelectProps,
} from "~/components/ui/select";

import {
  ContainerTruckIcon,
  LeafIcon,
  MushroomIcon,
  Question,
  Search,
  TruckIcon,
  TractorIcon,
  CirclePileIcon,
  GreenHouseIcon,
  AppleIcon,
  BroccoliIcon,
  CornIcon,
  CarrotIcon,
  OrangeIcon,
  WheatIcon,
  PumpkinIcon,
  SteakIcon,
  WatermelonIcon,
  Box,
} from "@hugeicons/core-free-icons";

export const IconComponents = {
  Search,
  Question,
  Mushroom: MushroomIcon,
  Truck: TruckIcon,
  "Container Truck": ContainerTruckIcon,
  Leaf: LeafIcon,
  Tractor: TractorIcon,
  "Circle Pile": CirclePileIcon,
  "Green House": GreenHouseIcon,
  Broccoli: BroccoliIcon,
  Corn: CornIcon,
  Carrot: CarrotIcon,
  Apple: AppleIcon,
  Orange: OrangeIcon,
  Wheat: WheatIcon,
  Pumpkin: PumpkinIcon,
  Steak: SteakIcon,
  Watermelon: WatermelonIcon,
} as const;

export type Icon = keyof typeof IconComponents;

export const Icon: React.FC<{ icon?: string | null; className?: string }> = ({
  icon,
  className,
}) => {
  if (!icon) return <HugeiconsIcon icon={Box} className={className} />;
  const IconComponent = IconComponents[icon as Icon] ?? Question;
  return <HugeiconsIcon icon={IconComponent} className={className} />;
};

export const IconPicker: React.FC<React.PropsWithChildren & SelectProps> = ({
  children,
  ...props
}) => {
  return (
    <Select {...props}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select an icon" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(IconComponents)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([name]) => (
            <SelectItem key={name} value={name}>
              <Icon icon={name as Icon} /> {name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
};
