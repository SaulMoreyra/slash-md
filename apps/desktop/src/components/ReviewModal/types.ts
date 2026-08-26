export type ReviewModalHub = {
  showPublish: boolean;
  publishReady: boolean;
  publishHint: string | null;
  showLeave: boolean;
  busy: boolean;
  onPublish: () => void;
  onLeave: () => void;
};
