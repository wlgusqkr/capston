// 404 — empty state. DESIGN_SYSTEM.md `empty-state`: center text only,
// 큰 헤드라인 + 한 줄 설명 + 1개 secondary action. design-audit F-17.
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        minHeight: '100vh',
        gap: 'var(--space-4)',
        padding: 'var(--space-6)',
        color: 'var(--color-text-muted)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 'var(--font-section-heading-size)',
          lineHeight: 'var(--font-section-heading-line)',
          fontWeight: 400,
          color: 'var(--color-text)',
          letterSpacing: 'var(--font-section-heading-tracking)',
        }}
      >
        페이지를 찾을 수 없습니다
      </h1>
      <p style={{ margin: 0, maxWidth: '40ch', wordBreak: 'keep-all' }}>
        주소가 바뀌었거나, 더 이상 사용하지 않는 페이지일 수 있어요. 메인 지도에서 다시
        시작해 주세요.
      </p>
      <Link
        to="/"
        style={{
          color: 'var(--color-action-blue)',
          textDecoration: 'underline',
          textUnderlineOffset: '2px',
        }}
      >
        ← 메인 지도로 돌아가기
      </Link>
    </main>
  );
}
