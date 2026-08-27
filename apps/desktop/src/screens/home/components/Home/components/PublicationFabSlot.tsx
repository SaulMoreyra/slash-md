import { PublicationFab } from "../../PublicationFab";
import { useHome } from "../context";

export function PublicationFabSlot() {
  const home = useHome();
  const canSendReview = Boolean(home.library.payload?.canSendReview);

  return (
    <PublicationFab
      visible={canSendReview}
      pending={canSendReview}
      busy={home.busy}
      onOpen={home.actions.onRequestReview}
    />
  );
}
