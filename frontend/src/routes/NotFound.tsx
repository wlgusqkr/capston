// 404 placeholder route.
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 'var(--space-4)',
        color: 'var(--color-text-muted)',
      }}
    >
      <h1 style={{ color: 'var(--color-text)' }}>페이지를 찾을 수 없습니다</h1>
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
