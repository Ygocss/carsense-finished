// frontend/src/components/Button.tsx
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ok" | "ghost";
};

export default function Button({ variant = "default", className, ...rest }: Props) {
  const cls =
    "btn " +
    (variant === "ok" ? "ok " : variant === "ghost" ? "ghost " : "") +
    (className ?? "");
  return <button {...rest} className={cls} />;
}
