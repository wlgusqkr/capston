// 2D / 3D toggle placeholder (SPEC 6.1).
// 3D rendering arrives in step 10 (deck.gl) if time permits. For step 4 the
// toggle is purely visual; clicking 3D does nothing yet.

export default function ViewToggle() {
  return (
    <div
      className="absolute right-4 bottom-4 inline-flex bg-surface border border-border rounded-sm overflow-hidden z-[400] shadow-floating font-[family-name:var(--font-family-base)]"
      role="group"
      aria-label="2D/3D 보기 전환"
    >
      <button
        type="button"
        className="appearance-none bg-secondary text-surface border-0 px-3 py-2 text-caption font-medium tracking-[var(--letter-spacing-ko)] cursor-pointer min-w-[44px]"
      >
        2D
      </button>
      <button
        type="button"
        className="appearance-none bg-transparent border-0 px-3 py-2 text-caption font-normal text-text-muted tracking-[var(--letter-spacing-ko)] min-w-[44px] disabled:cursor-not-allowed disabled:text-text-subtle"
        disabled
      >
        3D
      </button>
    </div>
  );
}
