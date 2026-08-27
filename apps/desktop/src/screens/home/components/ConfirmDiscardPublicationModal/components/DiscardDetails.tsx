type Props = {
  lede: string;
  dirty: string | null;
  review: string | null;
};

export function DiscardDetails({ lede, dirty, review }: Props) {
  return (
    <div className="mt-2 flex flex-col gap-2 text-sm text-muted">
      <p>{lede}</p>
      {dirty ? <p>{dirty}</p> : null}
      {review ? <p>{review}</p> : null}
    </div>
  );
}
