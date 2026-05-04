// MyPage (`/mypage`) — SPEC 6.6.
//
// R-4 (design-polish-v2.md): rebuilt as a 2-column workspace.
//   LEFT rail (sticky)   — Profile + MY WEIGHTS
//   RIGHT column (scroll) — MY FAVORITES + MY REVIEWS
//
// Strip <Card> wrappers; sections are unframed under the shared layout.
// At <1080px the columns collapse to a single column (left → on top).
// Mobile <768px is WONTFIX (project rule).
import { useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { Badge, Button, MetricBar } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites, useRemoveFavorite } from '@/hooks/useFavorites';
import type { FavoriteItem, MeResponse } from '@/types/api';

import './MyPage.css';

const MAX_COMPARE = 3;

export default function MyPage() {
  const navigate = useNavigate();
  const { user, isLoading, logout } = useAuth();

  // Wait until the boot-time getMe() resolves before deciding redirect.
  if (isLoading) {
    return (
      <main className="mypage" id="main">
        <div className="mypage__status" role="status" aria-live="polite">
          불러오는 중…
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <main className="mypage" id="main">
      <h1 className="sr-only">마이페이지</h1>

      <div className="mypage__logout-row">
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          로그아웃
        </Button>
      </div>

      <div className="mypage__layout">
        <aside className="mypage__rail" aria-label="프로필 및 가중치">
          <ProfileSection user={user} />
          <PreferenceSection user={user} />
        </aside>
        <div className="mypage__content">
          <FavoritesSection />
          <ReviewsSection />
        </div>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Profile (LEFT rail, top)                                                    */
/* -------------------------------------------------------------------------- */

function ProfileSection({ user }: { user: MeResponse }) {
  const display = (user.nickname && user.nickname.trim()) || user.username;

  const meta: string[] = [];
  if (user.school && user.school.trim()) meta.push(user.school);
  if (user.year != null) meta.push(`${user.year}학년`);

  const handleEdit = () => {
    // Phase B: simple inline placeholder. Profile editing arrives later
    // (PATCH /api/users/me already wired in lib/api.ts).
    window.alert('프로필 편집은 추후 추가됩니다.');
  };

  return (
    <section className="mypage__profile" aria-labelledby="profile-heading">
      <p className="mono-label" aria-hidden="true">PROFILE</p>
      <h2 id="profile-heading" className="mypage__display-name">
        {display}
      </h2>
      <p className="mypage__profile-meta">
        {meta.length > 0 ? meta.join(' · ') : '학교·학년 정보를 추가해주세요.'}
      </p>
      <div>
        <Button variant="secondary" size="sm" onClick={handleEdit}>
          수정
        </Button>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Preference (LEFT rail, bottom)                                              */
/* -------------------------------------------------------------------------- */

function PreferenceSection({ user }: { user: MeResponse }) {
  const navigate = useNavigate();
  const { w_rent, w_amenity, w_transit } = user.preference;

  const handleRelearn = () => {
    navigate('/?onboarding=1');
  };

  return (
    <section className="mypage__weights" aria-labelledby="weights-heading">
      <p className="mono-label" aria-hidden="true">MY WEIGHTS</p>
      <h2 id="weights-heading" className="mypage__section-heading">
        내 자취 기준
      </h2>
      <div className="mypage__bars">
        <MetricBar label="전월세" value={w_rent} tone="weight" unit="%" />
        <MetricBar label="생활시설" value={w_amenity} tone="weight" unit="%" />
        <MetricBar label="교통" value={w_transit} tone="weight" unit="%" />
      </div>
      <div>
        <Button variant="secondary" size="sm" onClick={handleRelearn}>
          선호 학습 다시 →
        </Button>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Favorites (RIGHT column, top)                                               */
/* -------------------------------------------------------------------------- */

function FavoritesSection() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useFavorites();
  const removeMut = useRemoveFavorite();

  const items: FavoriteItem[] = data ?? [];

  // First MAX_COMPARE favorites are selectable for compare-all CTA.
  const compareSlugs = useMemo(
    () => items.slice(0, MAX_COMPARE).map((f) => f.slug),
    [items]
  );

  const handleCompareAll = () => {
    if (compareSlugs.length === 0) return;
    navigate(`/compare?dongs=${compareSlugs.join(',')}`);
  };

  return (
    <section className="mypage__section" aria-labelledby="favorites-heading">
      <p className="mono-label" aria-hidden="true">MY FAVORITES</p>
      <header className="mypage__section-head">
        <h2 id="favorites-heading" className="mypage__section-heading">
          찜한 동네
          {items.length > 0 && (
            <span className="mypage__count tabular"> ({items.length})</span>
          )}
        </h2>
        {items.length >= 2 && (
          <button
            type="button"
            className="mypage__action-link"
            onClick={handleCompareAll}
          >
            {Math.min(items.length, MAX_COMPARE)}개 모두 비교하기 →
          </button>
        )}
      </header>

      {isLoading && (
        <div className="mypage__status" role="status">
          찜 목록을 불러오는 중…
        </div>
      )}

      {isError && (
        <div className="mypage__status mypage__status--error" role="alert">
          찜 목록을 불러오지 못했어요.
          <span className="mypage__status-detail">
            {error instanceof Error ? error.message : '알 수 없는 오류'}
          </span>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="mypage__empty">
          <p className="mypage__empty-text">아직 찜한 동네가 없어요.</p>
          <Link to="/" className="mypage__empty-link">
            메인 지도에서 동네 둘러보기 →
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <ul className="mypage__fav-list">
          {items.map((fav) => (
            <FavoriteRow
              key={fav.slug}
              item={fav}
              onOpen={() => navigate(`/dong/${fav.slug}`)}
              onRemove={() => removeMut.mutate(fav.slug)}
              removing={removeMut.isPending && removeMut.variables === fav.slug}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface FavoriteRowProps {
  item: FavoriteItem;
  onOpen: () => void;
  onRemove: () => void;
  removing: boolean;
}

function FavoriteRow({ item, onOpen, onRemove, removing }: FavoriteRowProps) {
  const score = Math.round(item.score);
  const variant = score >= 70 ? 'success' : score >= 40 ? 'warning' : 'danger';
  return (
    <li className="mypage__fav-row">
      <button
        type="button"
        className="mypage__fav-main"
        onClick={onOpen}
        aria-label={`${item.name} 상세 보기`}
      >
        <div className="mypage__fav-titles">
          <span className="mypage__fav-gu">{item.gu}</span>
          <span className="mypage__fav-name">{item.name}</span>
        </div>
        <div className="mypage__fav-meta">
          <Badge variant={variant}>{score}점</Badge>
          <span className="mypage__fav-date">{formatDate(item.created_at)}</span>
        </div>
      </button>
      <button
        type="button"
        className="mypage__fav-remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`${item.name} 찜 해제`}
        disabled={removing}
      >
        <span aria-hidden="true">×</span>
      </button>
    </li>
  );
}

function formatDate(iso: string): string {
  // YYYY-MM-DD locale-friendly. Fallback to raw string on parse error.
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
  } catch {
    return iso;
  }
}

/* -------------------------------------------------------------------------- */
/* Reviews (RIGHT column, bottom — empty state)                                */
/* -------------------------------------------------------------------------- */

function ReviewsSection() {
  return (
    <section className="mypage__section" aria-labelledby="reviews-heading">
      <p className="mono-label" aria-hidden="true">MY REVIEWS</p>
      <header className="mypage__section-head">
        <h2 id="reviews-heading" className="mypage__section-heading">
          내가 쓴 리뷰
        </h2>
      </header>
      <div className="mypage__empty">
        <p className="mypage__empty-text">아직 작성한 리뷰가 없어요.</p>
        <span className="mypage__empty-text--muted">
          동네 상세에서 리뷰를 남겨보세요.
        </span>
      </div>
    </section>
  );
}
