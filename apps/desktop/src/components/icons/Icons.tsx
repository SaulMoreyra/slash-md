import type { LucideProps } from "lucide-react";
import {
  ArrowDownToLine,
  Check,
  CheckCircle2,
  FileText,
  Folder,
  FolderKanban,
  GitBranch,
  GitMerge,
  GitPullRequest,
  History,
  Inbox,
  ListTodo,
  MessageSquare,
  MoreHorizontal,
  NotebookPen,
  Plus,
  RotateCcw,
  Scale,
  PanelLeft,
  PanelRight,
  Search,
  StickyNote,
  X,
  ChevronsUpDown,
  Calendar,
} from "lucide-react";

export type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

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

export function IconHistory(props: IconProps) {
  return <History {...lucideProps({ size: 20, ...props })} />;
}

export function IconChat(props: IconProps) {
  return <MessageSquare {...lucideProps({ size: 20, ...props })} />;
}

export function IconMerge(props: IconProps) {
  return <GitMerge {...lucideProps({ size: 20, ...props })} />;
}

/** Bring remote/wiki changes into the current publication. */
export function IconBringChanges(props: IconProps) {
  return <ArrowDownToLine {...lucideProps({ size: 14, ...props })} />;
}

export function IconClose(props: IconProps) {
  return <X {...lucideProps({ size: 18, ...props })} />;
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
