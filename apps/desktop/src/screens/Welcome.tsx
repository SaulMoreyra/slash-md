type Props = {
  busy: boolean;
  error: string | null;
  onOpen: () => void;
};

export function WelcomeScreen({ busy, error, onOpen }: Props) {
  return (
    <main className="welcome">
      <div className="welcome-card">
        <p className="eyebrow">Slash MD</p>
        <h1>Documentación local, review en GitHub</h1>
        <p className="lede">
          Abre el repo de docs. Escribes en el disco, mandas un lote a revisión y publicas cuando el PR está listo.
        </p>
        <button type="button" className="btn fill" disabled={busy} onClick={onOpen}>
          {busy ? "Abriendo…" : "Abrir carpeta"}
        </button>
        {error ? <p className="error">{error}</p> : null}
      </div>
    </main>
  );
}
