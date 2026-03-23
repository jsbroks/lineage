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
  ContainerIcon,
  TestTube01Icon,
  TestTubesIcon,
  PetrolPumpIcon,
  TreeIcon,
  PineTreeIcon,
  MapPinIcon,
  RecycleIcon,
  BatteryChargingIcon,
  BatteryFullIcon,
  SolarPanelIcon,
  GasPipeIcon,
  EcoLabIcon,
  BananaIcon,
  BarrelIcon,
  ApplePieIcon,
  ApricotIcon,
  CheeseIcon,
  BreadIcon,
  CupcakeIcon,
  DoughnutIcon,
  EggIcon,
  HamIcon,
  PizzaIcon,
  SaladIcon,
  MilkBottleIcon,
  MilkCartonIcon,
  YogurtIcon,
  PieIcon,
  IceCubesIcon,
  IceCreamIcon,
  PopsicleIcon,
  SoftDrinkIcon,
  EggsIcon,
  RiceBowlIcon,
  StreetFoodIcon,
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
  Container: ContainerIcon,
  "Test Tub": TestTube01Icon,
  "Test Tubes": TestTubesIcon,
  "Petrol Pump": PetrolPumpIcon,
  Tree: TreeIcon,
  "Pine Tree": PineTreeIcon,
  "Map Pin": MapPinIcon,
  Recycle: RecycleIcon,
  "Battery Charging": BatteryChargingIcon,
  "Battery Full": BatteryFullIcon,
  "Solar Panel": SolarPanelIcon,
  "Gas Pipe": GasPipeIcon,
  "Eco Lab": EcoLabIcon,
  Banana: BananaIcon,
  Barrel: BarrelIcon,
  "Apple Pie": ApplePieIcon,
  Apricot: ApricotIcon,
  Cheese: CheeseIcon,
  Bread: BreadIcon,
  Cupcake: CupcakeIcon,
  Doughnut: DoughnutIcon,
  Egg: EggIcon,
  Ham: HamIcon,
  Pizza: PizzaIcon,
  Salad: SaladIcon,
  "Milk Bottle": MilkBottleIcon,
  "Milk Carton": MilkCartonIcon,
  Yogurt: YogurtIcon,
  Pie: PieIcon,
  "Ice Cubes": IceCubesIcon,
  "Ice Cream": IceCreamIcon,
  Popsicle: PopsicleIcon,
  "Soft Drink": SoftDrinkIcon,
  Eggs: EggsIcon,
  "Rice Bowl": RiceBowlIcon,
  "Street Food": StreetFoodIcon,
} as const;

export type IconComponentName = keyof typeof IconComponents;

export const Icon: React.FC<{ icon?: string | null; className?: string }> = ({
  icon,
  className,
}) => {
  if (!icon) return <HugeiconsIcon icon={Box} className={className} />;
  const IconComponent = IconComponents[icon as IconComponentName] ?? Question;
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
              <Icon icon={name as IconComponentName} /> {name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
};
