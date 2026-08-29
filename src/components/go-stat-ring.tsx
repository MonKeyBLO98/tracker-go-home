"use client";

import Image from "next/image";
import type { ReactNode } from "react";

interface GoStatRingProps {
  iconSrc?: string;
  accentHex: string;
  value: number;
  max: number;
  naturalIcon?: boolean;
  /** Texto alternativo al icono (p.ej. "XXL"/"xxs", que no tienen asset oficial en GO) */
  textIcon?: string;
  /** Nodo React arbitrario en el centro del anillo (tiene prioridad sobre iconSrc/textIcon) */
  iconNode?: ReactNode;
  size?: number;
}

const INACTIVE_HEX = "#9CA3AF";

export function GoStatRing({
  iconSrc,
  accentHex,
  value,
  max,
  naturalIcon,
  textIcon,
  iconNode,
  size = 92,
}: GoStatRingProps) {
  const stroke = 7;
  const r = (size - stroke) / 2 - 1;
  const c = 2 * Math.PI * r;
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        role="img"
        aria-label={`${value} de ${max}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={fraction > 0 ? accentHex : INACTIVE_HEX}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        {iconNode ? (
          iconNode
        ) : textIcon ? (
          <span
            aria-hidden
            className="text-[10px] font-black leading-none tracking-tight uppercase"
            style={{ color: accentHex }}
          >
            {textIcon}
          </span>
        ) : iconSrc ? (
          naturalIcon ? (
            <Image
              src={iconSrc}
              alt=""
              aria-hidden
              width={18}
              height={18}
              unoptimized
              className="h-[18px] w-[18px] object-contain drop-shadow-sm"
            />
          ) : (
            <span
              aria-hidden
              className="inline-block h-4 w-4 shrink-0"
              style={{
                WebkitMaskImage: `url(${iconSrc})`,
                maskImage: `url(${iconSrc})`,
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
                backgroundColor: accentHex,
              }}
            />
          )
        ) : null}
        <span className="text-sm font-bold leading-none tabular-nums">
          {value}
        </span>
        <span className="text-[10px] leading-none text-muted-foreground tabular-nums">
          /{max}
        </span>
      </div>
    </div>
  );
}
