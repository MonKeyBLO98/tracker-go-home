"use client";

import Image from "next/image";

interface PokeballToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function PokeballToggle({
  checked,
  onChange,
  disabled,
}: PokeballToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={
        checked ? "Desmarcar como capturado" : "Marcar como capturado"
      }
      title={checked ? "Capturado" : "No capturado"}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
    >
      <Image
        src={checked ? "/badges/pokeball-on.png" : "/badges/pokeball-off.png"}
        alt=""
        width={28}
        height={28}
        unoptimized
        className="h-7 w-7 object-contain drop-shadow-sm"
      />
    </button>
  );
}
