import { Card } from "@heroui/react";
import { useApp } from "../../context";
import { Brand } from "./components/Brand";
import { Failure } from "./components/Failure";
import { Frame } from "./components/Frame";
import { Status } from "./components/Status";

function Body() {
  const { chrome, operations } = useApp();
  if (chrome.error) {
    return (
      <Failure
        message={chrome.error}
        onRetry={() => {
          void operations.refresh();
        }}
      />
    );
  }
  return <Status />;
}

function LoadingRoot() {
  return (
    <Frame>
      <Card className="app-no-drag w-full max-w-sm rounded-3xl border-0 bg-surface shadow-none animate-rise motion-reduce:animate-none">
        <Brand />
        <Body />
      </Card>
    </Frame>
  );
}
LoadingRoot.displayName = "App.Loading";

export const Loading = Object.assign(LoadingRoot, {
  Frame,
  Brand,
  Status,
  Failure,
});
