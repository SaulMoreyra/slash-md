import { Button, Card, Description, EmptyState } from "@heroui/react";

type Props = {
  title: string;
  body: string;
  action: string;
  onClick: () => void;
};

export function Empty({ title, body, action, onClick }: Props) {
  return (
    <EmptyState className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <Card.Title className="text-xl">{title}</Card.Title>
      <Description className="max-w-sm">{body}</Description>
      <Button variant="primary" onPress={onClick}>
        {action}
      </Button>
    </EmptyState>
  );
}
