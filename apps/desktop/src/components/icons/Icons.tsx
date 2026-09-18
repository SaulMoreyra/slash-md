import type { LucideProps } from "lucide-react";
import {
  ArrowDownToLine,
  ArrowUp,
  Check,
  CheckCircle2,
  FileText,
  Folder,
  FolderKanban,
  GitBranch,
  GitMerge,
  GitPullRequest,
  History,
  Image,
  Inbox,
  ListTodo,
  MessageSquare,
  MoreHorizontal,
  NotebookPen,
  Plus,
  RotateCcw,
  Scale,
  Sparkles,
  PanelLeft,
  PanelRight,
  Search,
  StickyNote,
  Trash2,
  X,
  ChevronsDownUp,
  ChevronsUpDown,
  Calendar,
} from "lucide-react";

export type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

const SLASH_MARK = (
  <>
    <path d="M2.58 22.2 10.22 1.8H12.67L5.03 22.2Z" />
    <path d="M16.97 21.1Q15.26 21.1 14.29 20.33Q13.32 19.56 13.32 18.17H15.24Q15.24 18.8 15.69 19.15Q16.14 19.5 16.97 19.5H17.76Q18.6 19.5 19.07 19.15Q19.53 18.8 19.53 18.15Q19.53 17.02 18.33 16.86L15.73 16.5Q14.63 16.36 14.04 15.63Q13.45 14.9 13.45 13.74Q13.45 12.39 14.35 11.65Q15.26 10.9 16.93 10.9H17.74Q19.28 10.9 20.24 11.64Q21.2 12.37 21.26 13.58H19.32Q19.28 13.09 18.86 12.78Q18.44 12.46 17.74 12.46H16.93Q16.16 12.46 15.74 12.8Q15.31 13.14 15.31 13.7Q15.31 14.64 16.34 14.78L18.78 15.1Q21.42 15.46 21.42 18.14Q21.42 19.56 20.47 20.33Q19.52 21.1 17.76 21.1Z" />
  </>
);

/** Product mark: large `/`, small `s` on the baseline (JetBrains Mono SemiBold). */
export function IconSlash({ size = 24, className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden
    >
      {SLASH_MARK}
    </svg>
  );
}

function lucideProps({ size = 16, className, strokeWidth = 1.75 }: IconProps): LucideProps {
  return { size, className, strokeWidth, "aria-hidden": true };
}

export function IconPlus(props: IconProps) {
  return <Plus {...lucideProps({ size: 16, ...props })} />;
}

export function IconSearch(props: IconProps) {
  return <Search {...lucideProps({ size: 16, ...props })} />;
}

export function IconMore(props: IconProps) {
  return <MoreHorizontal {...lucideProps({ size: 16, ...props })} />;
}

export function IconFolder(props: IconProps) {
  return <Folder {...lucideProps({ size: 16, ...props })} />;
}

export function IconPage(props: IconProps) {
  return <FileText {...lucideProps({ size: 16, ...props })} />;
}

export function IconInbox(props: IconProps) {
  return <Inbox {...lucideProps({ size: 18, ...props })} />;
}

export function IconDrafts(props: IconProps) {
  return <NotebookPen {...lucideProps({ size: 18, ...props })} />;
}

export function IconReviews(props: IconProps) {
  return <GitPullRequest {...lucideProps({ size: 18, ...props })} />;
}

export function IconBranch(props: IconProps) {
  return <GitBranch {...lucideProps({ size: 16, ...props })} />;
}

export function IconUnfold(props: IconProps) {
  return <ChevronsUpDown {...lucideProps({ size: 18, ...props })} />;
}

export function IconExpandAll(props: IconProps) {
  return <ChevronsUpDown {...lucideProps({ size: 16, ...props })} />;
}

export function IconCollapseAll(props: IconProps) {
  return <ChevronsDownUp {...lucideProps({ size: 16, ...props })} />;
}

export function IconHistory(props: IconProps) {
  return <History {...lucideProps({ size: 20, ...props })} />;
}

export function IconChat(props: IconProps) {
  return <MessageSquare {...lucideProps({ size: 20, ...props })} />;
}

export function IconSparkles(props: IconProps) {
  return <Sparkles {...lucideProps({ size: 18, ...props })} />;
}

export function IconMerge(props: IconProps) {
  return <GitMerge {...lucideProps({ size: 20, ...props })} />;
}

/** Bring remote/wiki changes into the current publication. */
export function IconBringChanges(props: IconProps) {
  return <ArrowDownToLine {...lucideProps({ size: 14, ...props })} />;
}

export function IconArrowUp(props: IconProps) {
  return <ArrowUp {...lucideProps({ size: 16, ...props })} />;
}

export function IconClose(props: IconProps) {
  return <X {...lucideProps({ size: 18, ...props })} />;
}

export function IconImage(props: IconProps) {
  return <Image {...lucideProps({ size: 16, ...props })} />;
}

export function IconTrash(props: IconProps) {
  return <Trash2 {...lucideProps({ size: 16, ...props })} />;
}

export function IconPanel(props: IconProps) {
  return <PanelLeft {...lucideProps({ size: 16, ...props })} />;
}

export function IconWorkPane(props: IconProps) {
  return <PanelRight {...lucideProps({ size: 16, ...props })} />;
}

export function IconDiscard(props: IconProps) {
  return <RotateCcw {...lucideProps({ size: 16, ...props })} />;
}

export function IconCheck(props: IconProps) {
  return <Check {...lucideProps({ size: 14, ...props })} />;
}

export function IconCheckCircle(props: IconProps) {
  return <CheckCircle2 {...lucideProps({ size: 40, ...props, strokeWidth: props.strokeWidth ?? 1.5 })} />;
}

export function IconTemplateBlank(props: IconProps) {
  return <FileText {...lucideProps({ size: 24, ...props })} />;
}

export function IconTemplateMeeting(props: IconProps) {
  return <Calendar {...lucideProps({ size: 24, ...props })} />;
}

export function IconTemplateTasks(props: IconProps) {
  return <ListTodo {...lucideProps({ size: 24, ...props })} />;
}

export function IconTemplateProject(props: IconProps) {
  return <FolderKanban {...lucideProps({ size: 24, ...props })} />;
}

export function IconTemplateNotes(props: IconProps) {
  return <StickyNote {...lucideProps({ size: 24, ...props })} />;
}

export function IconTemplateDecision(props: IconProps) {
  return <Scale {...lucideProps({ size: 24, ...props })} />;
}
