import { TabList } from "./components/TabList";
import { useTabBarController, type TabBarProps } from "./hooks/useTabBarController";

export function TabBar(props: TabBarProps) {
  const { empty, ...list } = useTabBarController(props);
  if (empty) {
    return null;
  }
  return (
    <div className="flex shrink-0 overflow-x-auto border-b border-separator [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-separator">
      <TabList {...list} />
    </div>
  );
}
