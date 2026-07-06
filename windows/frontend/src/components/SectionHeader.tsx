import Icon from "./Icon";

interface Props {
  title: string;
  subtitle?: string;
  onMore?: () => void;
}

export default function SectionHeader({ title, subtitle, onMore }: Props) {
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-xl font-bold text-primary">{title}</h2>
        {subtitle && (
          <p className="truncate text-sm text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      {onMore && <Icon name="arrow_forward" size={20} className="text-primary" />}
    </>
  );

  if (onMore) {
    return (
      <button
        onClick={onMore}
        className="mb-3 flex w-full items-center gap-2 text-left"
      >
        {content}
      </button>
    );
  }
  return <div className="mb-3 flex items-center gap-2">{content}</div>;
}
