import { PublicationFab } from "../../PublicationFab";
import { useHome } from "../context";

export function PublicationFabSlot() {
  const home = useHome();
  const publication = home.library.payload?.publication;

  return (
    <PublicationFab
      visible={Boolean(publication)}
      pending={Boolean(home.library.payload?.canSendReview)}
      onOpen={home.actions.onRequestReview}
    />
  );
}
