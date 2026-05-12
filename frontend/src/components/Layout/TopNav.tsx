// TopNav — global 3-zone navigation chrome (R-2 Stage 3).
import { Link, useLocation } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { usePageTitleValue } from '@/contexts/PageTitleContext';
import iconSvg from '@/assets/icon.svg';

function dongSlugFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/dong\/([^/]+)/);
  return match?.[1];
}

type AuthVariant = 'auth-login' | 'auth-register' | 'default';

interface RouteSpec {
  center:
    | { kind: 'none' }
    | { kind: 'static'; label: string }
    | { kind: 'dongDetail' }
    | { kind: 'mypage' };
  authVariant: AuthVariant;
}

function specForPath(pathname: string): RouteSpec {
  if (pathname === '/login')
    return { center: { kind: 'none' }, authVariant: 'auth-register' };
  if (pathname === '/register')
    return { center: { kind: 'none' }, authVariant: 'auth-login' };
  if (pathname === '/compare')
    return {
      center: { kind: 'static', label: '동네 비교' },
      authVariant: 'default',
    };
  if (pathname === '/mypage')
    return { center: { kind: 'mypage' }, authVariant: 'default' };
  if (pathname.startsWith('/dong/'))
    return { center: { kind: 'dongDetail' }, authVariant: 'default' };
  return { center: { kind: 'none' }, authVariant: 'default' };
}

export default function TopNav() {
  const location = useLocation();
  const { user } = useAuth();
  const publishedTitle = usePageTitleValue();

  const spec = specForPath(location.pathname);
  const dongSlug = dongSlugFromPath(location.pathname);

  return (
    <header className="sticky top-0 z-[1000] w-full h-[var(--space-14)] bg-surface border-b border-divider" role="banner">
      <a
        className="absolute left-3 top-1 px-3 py-1 bg-primary text-surface rounded-sm text-caption no-underline -translate-y-[150%] transition-transform duration-[120ms] ease-out focus-visible:translate-y-0 focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2"
        href="#main"
      >
        메인 콘텐츠로 건너뛰기
      </a>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 h-full px-6 max-w-[1440px] mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 no-underline text-text font-normal tracking-normal hover:text-secondary focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2 focus-visible:rounded-sm"
          aria-label="홈으로"
        >
          <img src={iconSvg} alt="" className="w-[var(--control-height-sm)] h-[var(--control-height-sm)] shrink-0 object-contain" aria-hidden="true" />
          <span className="text-body-base font-normal">슬기로운 자취생활</span>
        </Link>

        <div className="flex items-center justify-center max-w-[480px] min-w-0">
          {spec.center.kind === 'static' && (
            <span className="text-body-large font-normal text-text tracking-normal whitespace-nowrap overflow-hidden text-ellipsis">{spec.center.label}</span>
          )}
          {spec.center.kind === 'dongDetail' && (
            <span className="text-body-large font-normal text-text tracking-normal whitespace-nowrap overflow-hidden text-ellipsis">
              {publishedTitle ?? dongSlug ?? ''}
            </span>
          )}
          {spec.center.kind === 'mypage' && (
            <span className="text-body-large font-normal text-text tracking-normal whitespace-nowrap overflow-hidden text-ellipsis">
              {user
                ? (user.nickname && user.nickname.trim()) || user.username
                : ''}
            </span>
          )}
        </div>

        <nav className="flex items-center justify-end gap-3" aria-label="사용자 메뉴">
          {spec.authVariant === 'auth-login' && (
            <Link to="/login" className="inline-flex items-center gap-1 no-underline text-text text-caption tracking-normal py-2 px-3 rounded-sm transition-all duration-[120ms] ease-out hover:bg-primary-soft hover:text-secondary focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2">
              로그인 →
            </Link>
          )}
          {spec.authVariant === 'auth-register' && (
            <Link to="/register" className="inline-flex items-center gap-1 no-underline text-text text-caption tracking-normal py-2 px-3 rounded-sm transition-all duration-[120ms] ease-out hover:bg-primary-soft hover:text-secondary focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2">
              회원가입 →
            </Link>
          )}
          {spec.authVariant === 'default' &&
            (user ? (
              <Link to="/mypage" className="inline-flex items-center gap-1 no-underline text-text text-caption tracking-normal py-2 px-3 rounded-sm transition-all duration-[120ms] ease-out hover:bg-primary-soft hover:text-secondary focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2">
                <span className="text-text font-medium">
                  {(user.nickname && user.nickname.trim()) || user.username}
                </span>
                <span className="text-text-subtle" aria-hidden="true">
                  {' · '}
                </span>
                <span>마이페이지</span>
              </Link>
            ) : (
              <Link to="/login" className="inline-flex items-center gap-1 no-underline text-text-muted text-caption tracking-normal py-2 px-3 rounded-sm transition-all duration-[120ms] ease-out hover:bg-primary-soft hover:text-secondary focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2">
                로그인 →
              </Link>
            ))}
        </nav>
      </div>
    </header>
  );
}
