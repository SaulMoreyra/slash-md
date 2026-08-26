import { Home } from "./components/Home";
import type { HomeScreenProps } from "./types";

/** Thin screen — composition lives in `Home` compound. */
export function HomeScreen(props: HomeScreenProps) {
  return <Home {...props} />;
}
