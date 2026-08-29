import Image from "next/image";
import { minidexIconParts } from "@/app/minidex/types";

interface GameDexIconProps {
  gameKey: string;
  size: number;
  className?: string;
}

export function GameDexIcon({ gameKey, size, className }: GameDexIconProps) {
  const { left, right } = minidexIconParts(gameKey);
  if (!left) return null;

  if (!right) {
    return (
      <Image
        src={left}
        alt=""
        width={size}
        height={size}
        unoptimized
        className={className}
      />
    );
  }

  const half = Math.floor(size / 2);
  return (
    <span
      className={`relative inline-block overflow-hidden align-middle ${className ?? ""}`}
      style={{ width: half * 2, height: size }}
    >
      <Image
        src={left}
        alt=""
        width={half}
        height={size}
        unoptimized
        className="absolute top-0 left-0 object-cover object-left"
        style={{ width: half, height: size }}
      />
      <Image
        src={right}
        alt=""
        width={half}
        height={size}
        unoptimized
        className="absolute top-0 right-0 object-cover object-right"
        style={{ width: half, height: size }}
      />
    </span>
  );
}
