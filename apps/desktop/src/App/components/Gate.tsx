import { useApp } from "../context";
import { AppPhase } from "../enums";
import { Loading } from "./Loading";
import { WelcomeSlot } from "./WelcomeSlot";
import { Workspace } from "./Workspace";

export function Gate() {
  const { phase } = useApp();
  if (phase === AppPhase.Loading) {
    return <Loading />;
  }
  if (phase === AppPhase.Welcome) {
    return <WelcomeSlot />;
  }
  return <Workspace />;
}

Gate.displayName = "App.Gate";
