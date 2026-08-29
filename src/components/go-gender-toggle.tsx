"use client";

import { setGoGender, type GoGenderValue } from "@/app/go/actions";
import { useTransition } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const BASE =
  "inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold leading-none transition-colors hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
const INACTIVE =
  "bg-gray-400 dark:bg-gray-600 border-transparent text-white/90 hover:bg-gray-500 dark:hover:bg-gray-500";
const MALE_ACTIVE =
  "bg-blue-500 border-blue-600 text-white hover:bg-blue-500 dark:bg-blue-500";
const FEMALE_ACTIVE =
  "bg-red-500 border-red-600 text-white hover:bg-red-500 dark:bg-red-500";
const GENDERLESS_ACTIVE =
  "bg-gray-200 border-gray-400 ring-2 ring-gray-400 text-gray-700 hover:bg-gray-200 dark:bg-gray-400 dark:border-gray-300 dark:text-gray-900";

interface GoGenderToggleProps {
  pokemonNationalDex: number;
  genderRate: number | null;
  value: GoGenderValue | null;
  disabled?: boolean;
  userId?: number | null;
  onChange: (value: GoGenderValue | null) => void;
}

type Variant = "both" | "male" | "female" | "genderless";

function getVariant(genderRate: number | null): Variant {
  if (genderRate === null) return "both";
  if (genderRate === -1) return "genderless";
  if (genderRate === 0) return "male";
  if (genderRate === 8) return "female";
  return "both";
}

function GenderButton({
  symbol,
  label,
  active,
  activeClass,
  onClick,
  disabled,
}: {
  symbol: string;
  label: string;
  active: boolean;
  activeClass: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={onClick}
        className={`${BASE} ${active ? activeClass : INACTIVE}`}
      >
        {symbol}
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function GoGenderToggle({
  pokemonNationalDex,
  genderRate,
  value,
  disabled,
  userId,
  onChange,
}: GoGenderToggleProps) {
  const [isPending, startTransition] = useTransition();
  const variant = getVariant(genderRate);

  const handleSet = (next: GoGenderValue | null) => {
    startTransition(async () => {
      await setGoGender(pokemonNationalDex, next, userId);
      onChange(next);
    });
  };

  const pendingClass = isPending ? "opacity-60" : "";

  if (variant === "genderless") {
    const active = value === "genderless";
    return (
      <div className={pendingClass}>
        <GenderButton
          symbol="—"
          label="Sin género"
          active={active}
          activeClass={GENDERLESS_ACTIVE}
          disabled={disabled}
          onClick={() => handleSet(active ? null : "genderless")}
        />
      </div>
    );
  }

  if (variant === "male") {
    const active = value === "male" || value === "both";
    return (
      <div className={pendingClass}>
        <GenderButton
          symbol="♂"
          label="Macho"
          active={active}
          activeClass={MALE_ACTIVE}
          disabled={disabled}
          onClick={() =>
            handleSet(active ? null : value === "female" ? "both" : "male")
          }
        />
      </div>
    );
  }

  if (variant === "female") {
    const active = value === "female" || value === "both";
    return (
      <div className={pendingClass}>
        <GenderButton
          symbol="♀"
          label="Hembra"
          active={active}
          activeClass={FEMALE_ACTIVE}
          disabled={disabled}
          onClick={() =>
            handleSet(active ? null : value === "male" ? "both" : "female")
          }
        />
      </div>
    );
  }

  const maleActive = value === "male" || value === "both";
  const femaleActive = value === "female" || value === "both";

  return (
    <div className={`flex gap-1 ${pendingClass}`}>
      <GenderButton
        symbol="♂"
        label="Macho"
        active={maleActive}
        activeClass={MALE_ACTIVE}
        disabled={disabled}
        onClick={() =>
          handleSet(
            maleActive
              ? femaleActive
                ? "female"
                : null
              : femaleActive
                ? "both"
                : "male"
          )
        }
      />
      <GenderButton
        symbol="♀"
        label="Hembra"
        active={femaleActive}
        activeClass={FEMALE_ACTIVE}
        disabled={disabled}
        onClick={() =>
          handleSet(
            femaleActive
              ? maleActive
                ? "male"
                : null
              : maleActive
                ? "both"
                : "female"
          )
        }
      />
    </div>
  );
}
