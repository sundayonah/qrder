import { type ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: Props) {
  const base =
    "inline-flex cursor-pointer items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

  const styles =
    variant === "primary"
      ? "bg-black text-white hover:bg-neutral-800 active:bg-neutral-900"
      : variant === "secondary"
        ? "border border-black bg-white text-black hover:bg-neutral-50 active:bg-neutral-100"
        : "border border-black bg-white text-black hover:bg-neutral-100";

  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
