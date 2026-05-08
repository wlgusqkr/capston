// TopNav — global 3-zone navigation chrome (R-2 Stage 3).
//
// Zone layout per route (D-2 + D-5 revised: contextual, no mode switcher):
//
//   route             left              center                  right
//   --------------    ----------------- ----------------------  ---------------------
//   /                 logo              (none — map is content) {nickname}·마이페이지 / 로그인
//   /dong/:slug       logo              {dong name from ctx}    {nickname}·마이페이지 / 로그인
//   /compare          logo              "동네 비교"             {nickname}·마이페이지 / 로그인
//   /mypage           logo              {nickname}              로그아웃 (handled inline)
//   /login            logo              (none)                  회원가입 →
//   /register         logo              (none)                  로그인 →
//   /404              logo              (none)                  default unauthed link
//
// Logo always navigates to /. No mode-switcher pills (D-5 revised — broken
// mental model, removed entirely).
//
// Center title for /dong/:slug comes from <PageTitleContext> populated by
// the DongDetail page itself. While DongDetail's data is loading, fallback
// is the URL slug; on error, also slug. Avoids TopNav fetching dong data
// independently (which would break React Query dedup if weights differ).

import { Link, useLocation } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { usePageTitleValue } from '@/contexts/PageTitleContext';
import iconSvg from '@/assets/icon.svg';

import './TopNav.css';

/** Extract the slug from /dong/:slug. TopNav is rendered ABOVE <Routes>
 *  so useParams() returns {} — we parse the pathname ourselves. */
function dongSlugFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/dong\/([^/]+)/);
  return match?.[1];
}

type AuthVariant = 'auth-login' | 'auth-register' | 'default';

interface RouteSpec {
  /** What goes in the center zone. */
  center:
    | { kind: 'none' }
    | { kind: 'static'; label: string }
    | { kind: 'dongDetail' }
    | { kind: 'mypage' };
  /** What goes in the right zone. */
  authVariant: AuthVariant;
}

/** Pure router from `pathname` → display variant. Single source for the
 *  contextual TopNav rules. Add new routes here. */
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
  // `/` and 404 fall through:
  return { center: { kind: 'none' }, authVariant: 'default' };
}

export default function TopNav() {
  const location = useLocation();
  const { user } = useAuth();
  const publishedTitle = usePageTitleValue();

  const spec = specForPath(location.pathname);
  const dongSlug = dongSlugFromPath(location.pathname);

  return (
    <header className="topnav" role="banner">
      <a className="topnav__skip-link" href="#main">
        메인 콘텐츠로 건너뛰기
      </a>

      <div className="topnav__inner">
        {/* ---- Left: brand mark + wordmark, click → / ---- */}
        <Link to="/" className="topnav__brand" aria-label="홈으로">
          <img src={iconSvg} alt="" className="topnav__brand-icon" aria-hidden="true" />
          <span className="topnav__brand-text">슬기로운 자취생활</span>
        </Link>

        {/* ---- Center: contextual page identity ---- */}
        <div className="topnav__center">
          {spec.center.kind === 'static' && (
            <span className="topnav__page-title">{spec.center.label}</span>
          )}
          {spec.center.kind === 'dongDetail' && (
            <span className="topnav__page-title">
              {publishedTitle ?? dongSlug ?? ''}
            </span>
          )}
          {spec.center.kind === 'mypage' && (
            <span className="topnav__page-title">
              {user
                ? (user.nickname && user.nickname.trim()) || user.username
                : ''}
            </span>
          )}
          {/* kind === 'none' → empty center */}
        </div>

        {/* ---- Right: auth-state-driven links ---- */}
        <nav className="topnav__right" aria-label="사용자 메뉴">
          {spec.authVariant === 'auth-login' && (
            <Link to="/login" className="topnav__action">
              로그인 →
            </Link>
          )}
          {spec.authVariant === 'auth-register' && (
            <Link to="/register" className="topnav__action">
              회원가입 →
            </Link>
          )}
          {spec.authVariant === 'default' &&
            (user ? (
              <Link to="/mypage" className="topnav__action">
                <span className="topnav__user-name">
                  {(user.nickname && user.nickname.trim()) || user.username}
                </span>
                <span className="topnav__user-sep" aria-hidden="true">
                  {' · '}
                </span>
                <span>마이페이지</span>
              </Link>
            ) : (
              <Link to="/login" className="topnav__action topnav__action--guest">
                로그인 →
              </Link>
            ))}
        </nav>
      </div>
    </header>
  );
}
