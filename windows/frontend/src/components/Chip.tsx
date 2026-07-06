import Icon from "./Icon";

interface Props {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}

export default function Chip({ label, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`flex h-8 shrink-0 scale-100 items-center gap-1.5 rounded-2xl px-3.5 text-xs font-medium transition-all duration-150 ${
        selected
          ? "elevate-1 scale-[1.02] bg-secondary-container text-on-secondary-container"
          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
      }`}
    >
      {selected && <Icon name="check" size={16} />}
      {label}
    </button>
  );
}
