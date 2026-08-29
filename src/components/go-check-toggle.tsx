"use client";

import { Switch } from "@/components/ui/switch";
import { toggleGoCheck } from "@/app/go/actions";
import { useTransition, useState } from "react";
import { ArrowUpDown, AlertTriangle, Check, type LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GoCheckToggleProps {
  pokemonNationalDex: number;
  checkName: string;
  label: string;
  icon?: React.ReactNode;
  iconSrc?: string;
  accentHex?: string;
  checked: boolean;
  switchClassName?: string;
  labelActiveClass?: string;
  userId?: number | null;
  shinyOverride?: boolean;
  onToggle: (checkName: string, value: boolean) => void;
  onToggleOverride?: (shinyOverride: boolean) => void;
}

const INACTIVE_HEX = "#9CA3AF";

function GoBadgeIcon({
  icon,
  iconSrc,
  accentHex,
  checked,
}: Pick<GoCheckToggleProps, "icon" | "iconSrc" | "accentHex" | "checked">) {
  if (iconSrc) {
    return (
      <span
        aria-hidden
        className="inline-block h-3.5 w-3.5 shrink-0"
        style={{
          WebkitMaskImage: `url(${iconSrc})`,
          maskImage: `url(${iconSrc})`,
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          backgroundColor: checked
            ? (accentHex ?? INACTIVE_HEX)
            : INACTIVE_HEX,
        }}
      />
    );
  }
  return <>{icon}</>;
}

export function GoCheckToggle({
  pokemonNationalDex,
  checkName,
  label,
  icon,
  iconSrc,
  accentHex,
  checked,
  switchClassName,
  labelActiveClass,
  userId,
  shinyOverride,
  onToggle,
  onToggleOverride,
}: GoCheckToggleProps) {
  const [isPending, startTransition] = useTransition();
  const [contextOpen, setContextOpen] = useState(false);

  const isShinyCheck = checkName === "isShiny";
  const isOverride = isShinyCheck && shinyOverride === true;

  const handleToggle = async (value: boolean) => {
    startTransition(async () => {
      await toggleGoCheck(pokemonNationalDex, checkName, value, userId);
      onToggle(checkName, value);
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isShinyCheck) return;
    e.preventDefault();
    e.stopPropagation();
    setContextOpen(true);
  };

  const handleOverrideOn = () => {
    onToggleOverride?.(true);
  };

  const handleOverrideOff = () => {
    onToggleOverride?.(false);
  };

  const effectiveSwitchClass = isOverride
    ? "data-[checked]:bg-orange-500! data-[checked]:[&_[data-slot=switch-thumb]]:bg-orange-700!"
    : switchClassName;

  const effectiveLabelClass = isOverride
    ? "text-orange-500 dark:text-orange-400"
    : labelActiveClass;

  const tooltipText = isOverride
    ? `${label} (override manual - el juego no lo registra)`
    : label;

  const toggleContent = (
    <span className="inline-flex items-center gap-1.5">
      <Switch
        checked={checked}
        onCheckedChange={handleToggle}
        disabled={isPending}
        className={`scale-75 ${effectiveSwitchClass ?? ""}`}
      />
      <span
        className={`inline-flex items-center gap-1 text-xs ${checked ? `${effectiveLabelClass ?? "text-primary"} font-medium` : "text-muted-foreground"}`}
      >
        <GoBadgeIcon
          icon={icon}
          iconSrc={iconSrc}
          accentHex={isOverride ? "#F97316" : accentHex}
          checked={checked}
        />
        {label}
        {isOverride && (
          <AlertTriangle className="h-3 w-3 text-orange-500" />
        )}
      </span>
    </span>
  );

  if (!isShinyCheck) {
    return (
      <Tooltip>
        <TooltipTrigger className="inline-flex items-center gap-1.5">
          {toggleContent}
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu open={contextOpen} onOpenChange={setContextOpen}>
      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center gap-1.5"
          onContextMenu={handleContextMenu}
          render={<div />}
        >
          <DropdownMenuTrigger render={<span className="inline-flex items-center gap-1.5" />}>
            {toggleContent}
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" sideOffset={4}>
        <DropdownMenuItem onClick={handleOverrideOff}>
          <Check className={`h-4 w-4 ${!isOverride ? "text-green-500" : "text-muted-foreground"}`} />
          Shiny normal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOverrideOn}>
          <AlertTriangle className={`h-4 w-4 ${isOverride ? "text-orange-500" : "text-muted-foreground"}`} />
          Override manual
          <span className="text-muted-foreground text-[10px] ml-auto">juego con error</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface GoCheckDef {
  name: string;
  label: string;
  icon?: LucideIcon;
  iconSrc?: string;
  accentHex?: string;
  switchClass: string;
  activeLabelClass: string;
}

export const GO_CHECKS: GoCheckDef[] = [
  {
    name: "isShiny",
    label: "Shiny",
    iconSrc: "/badges/shiny.png",
    accentHex: "#16A34A",
    switchClass:
      "data-[checked]:bg-[#39FF14]! data-[checked]:[&_[data-slot=switch-thumb]]:bg-green-700!",
    activeLabelClass: "text-green-600 dark:text-green-400",
  },
  {
    name: "isHundo",
    label: "Hundo",
    iconSrc: "/badges/hundo.png",
    accentHex: "#2563EB",
    switchClass:
      "data-[checked]:bg-blue-500! data-[checked]:[&_[data-slot=switch-thumb]]:bg-blue-100!",
    activeLabelClass: "text-blue-600 dark:text-blue-400",
  },
  {
    name: "isLucky",
    label: "Lucky",
    iconSrc: "/badges/lucky.png",
    accentHex: "#EA580C",
    switchClass:
      "data-[checked]:bg-orange-500! data-[checked]:[&_[data-slot=switch-thumb]]:bg-orange-100!",
    activeLabelClass: "text-orange-600 dark:text-orange-400",
  },
  {
    name: "isXXL",
    label: "XXL",
    icon: ArrowUpDown,
    accentHex: "#4B5563",
    switchClass:
      "data-[checked]:bg-gray-600! data-[checked]:[&_[data-slot=switch-thumb]]:bg-gray-200!",
    activeLabelClass: "text-gray-600 dark:text-gray-300",
  },
  {
    name: "isXXS",
    label: "xxs",
    icon: ArrowUpDown,
    accentHex: "#6B7280",
    switchClass:
      "data-[checked]:bg-gray-300! data-[checked]:ring-1 data-[checked]:ring-gray-400 data-[checked]:[&_[data-slot=switch-thumb]]:bg-gray-500!",
    activeLabelClass: "text-gray-500 dark:text-gray-300",
  },
  {
    name: "isMega",
    label: "Mega",
    iconSrc: "/badges/mega.png",
    accentHex: "#C026D3",
    switchClass:
      "data-[checked]:bg-fuchsia-500! data-[checked]:[&_[data-slot=switch-thumb]]:bg-fuchsia-100!",
    activeLabelClass: "text-fuchsia-600 dark:text-fuchsia-400",
  },
  {
    name: "isGmax",
    label: "Gmax",
    iconSrc: "/badges/gmax.png",
    accentHex: "#A21CAF",
    switchClass:
      "data-[checked]:bg-fuchsia-700! data-[checked]:[&_[data-slot=switch-thumb]]:bg-fuchsia-200!",
    activeLabelClass: "text-fuchsia-700 dark:text-fuchsia-400",
  },
  {
    name: "isShadow",
    label: "Shadow",
    iconSrc: "/badges/shadow.png",
    accentHex: "#7C3AED",
    switchClass:
      "data-[checked]:bg-violet-500! data-[checked]:[&_[data-slot=switch-thumb]]:bg-violet-200!",
    activeLabelClass: "text-violet-600 dark:text-violet-400",
  },
  {
    name: "isPurified",
    label: "Pure",
    iconSrc: "/badges/purified.png",
    accentHex: "#6B7280",
    switchClass:
      "data-[checked]:bg-white! data-[checked]:ring-2 data-[checked]:ring-gray-300 data-[checked]:[&_[data-slot=switch-thumb]]:bg-gray-300! dark:data-[checked]:[&_[data-slot=switch-thumb]]:bg-gray-600!",
    activeLabelClass: "text-gray-500 dark:text-gray-300",
  },
];
