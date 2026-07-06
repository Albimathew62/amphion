import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  CircleCheck,
  CloudOff,
  Disc3,
  Download,
  EllipsisVertical,
  Heart,
  History,
  House,
  LibraryBig,
  Link,
  ListChecks,
  ListMusic,
  ListPlus,
  ListStart,
  LoaderCircle,
  MicVocal,
  Music,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  Repeat1,
  Search,
  SearchX,
  Settings,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Trash2,
  User,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  home: House,
  search: Search,
  library_music: LibraryBig,
  history: History,
  settings: Settings,
  check: Check,
  add: Plus,
  close: X,
  link: Link,
  arrow_forward: ArrowRight,
  arrow_back: ArrowLeft,
  north_west: ArrowUpLeft,
  expand_less: ChevronUp,
  keyboard_arrow_down: ChevronDown,
  more_vert: EllipsisVertical,
  play_arrow: Play,
  pause: Pause,
  skip_previous: SkipBack,
  skip_next: SkipForward,
  shuffle: Shuffle,
  repeat: Repeat,
  repeat_one: Repeat1,
  favorite: Heart,
  volume_up: Volume2,
  volume_off: VolumeX,
  equalizer: SlidersHorizontal,
  music_note: Music,
  album: Disc3,
  person: User,
  queue_music: ListMusic,
  playlist_play: ListStart,
  playlist_add: ListPlus,
  library_add: ListPlus,
  library_add_check: ListChecks,
  lyrics: MicVocal,
  download: Download,
  download_done: CircleCheck,
  downloading: LoaderCircle,
  progress_activity: LoaderCircle,
  delete: Trash2,
  delete_history: Trash2,
  sync: RefreshCw,
  cloud_sync: RefreshCw,
  cloud_off: CloudOff,
  search_off: SearchX,
};

const FILLABLE = new Set([
  "favorite",
  "play_arrow",
  "pause",
  "skip_previous",
  "skip_next",
  "home",
]);

interface Props {
  name: string;
  filled?: boolean;
  size?: number;
  className?: string;
}

export default function Icon({ name, filled, size = 24, className = "" }: Props) {
  const IconComponent = ICONS[name] ?? Circle;
  return (
    <IconComponent
      size={size}
      className={className}
      fill={filled && FILLABLE.has(name) ? "currentColor" : "none"}
      aria-hidden
    />
  );
}
