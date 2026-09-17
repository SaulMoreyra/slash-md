import { TabList } from "./components/TabList";
import { useTabBarController, type TabBarProps } from "./hooks/useTabBarController";

export function TabBar(props: TabBarProps) {
  const { empty, ...list } = useTabBarController(props);
  if (empty) {
    return null;
  }
  return (
    <div className="flex shrink-0 overflow-x-auto border-b border-separator">
      <TabList {...list} />
    </div>
  );
}
