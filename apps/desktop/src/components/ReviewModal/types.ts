export type ReviewModalHub = {
  showPublish: boolean;
  showLeave: boolean;
  busy: boolean;
  onPublish: () => void;
  onLeave: () => void;
};
