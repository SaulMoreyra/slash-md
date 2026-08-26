import { Avatar, Card } from "@heroui/react";

export function Brand() {
  return (
    <Card.Header className="flex items-center gap-3">
      <Avatar size="lg" color="accent">
        <Avatar.Fallback>MD</Avatar.Fallback>
      </Avatar>
      <Card.Title className="text-xl">Slash MD</Card.Title>
    </Card.Header>
  );
}

Brand.displayName = "App.Loading.Brand";
