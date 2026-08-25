import { useEffect, useState } from "react";
import { Modal } from "./Modal";

const api = () => window.slashmd;

type Props = {
  onClose: () => void;
  onSend: (reviewers: string) => void;
  note?: string;
};

export function ReviewModal({ onClose, onSend, note }: Props) {
  const [reviewers, setReviewers] = useState("");
  const [items, setItems] = useState<{ title: string; path: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api()
      .previewReview()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Modal title="Mandar a Revisión" onClose={onClose}>
      {note ? <p className="lede">{note}</p> : null}
      {loading ? (
        <p className="muted">Preparando el lote…</p>
      ) : items.length === 0 ? (
        <p className="muted">No hay borradores en el lote. Guarda cambios locales o elige páginas en Home.</p>
      ) : (
        <ul className="preview-list">
          {items.map((item) => (
            <li key={item.path}>
              {item.title} <span className="muted">({item.path})</span>
            </li>
          ))}
        </ul>
      )}
      <label>
        Reviewers (opcional)
        <input value={reviewers} onChange={(ev) => setReviewers(ev.target.value)} placeholder="@alice bob" />
      </label>
      <div className="hang-actions">
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn fill" disabled={items.length === 0} onClick={() => onSend(reviewers)}>
          Enviar
        </button>
      </div>
    </Modal>
  );
}
