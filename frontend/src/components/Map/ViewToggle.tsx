// 2D ↔ 3D toggle placeholder (SPEC 6.1).
// 3D rendering arrives in step 10 (deck.gl) if time permits. For step 4 the
// toggle is purely visual; clicking 3D does nothing yet.
import './ViewToggle.css';

export default function ViewToggle() {
  return (
    <div className="view-toggle" role="group" aria-label="2D/3D 보기 전환">
      <button type="button" className="view-toggle__btn view-toggle__btn--active">
        2D
      </button>
      <button type="button" className="view-toggle__btn" disabled>
        3D
      </button>
    </div>
  );
}
