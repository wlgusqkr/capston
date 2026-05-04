// MyPage (`/mypage`) — SPEC 6.6.
//
// Sections (top → bottom):
//   1. Profile  — avatar (initial) + nickname + school·year + 수정 button
//   2. 내 가중치 — 통학/주거비/생활시설 % bars + "다시 학습하기" link
//   3. 찜한 동네 — list of favorite cards + "N개 모두 비교하기 →"
//   4. 내가 쓴 리뷰 — empty state (Review model not implemented yet)
//
// Auth gate: redirects to /login when not authenticated.
import { useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { Badge, Button, Card, MetricBar } from '@/components/ui';
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
      <main className="mypage">
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
    <main className="mypage">
      <header className="mypage__topbar">
        <div className="mypage__topbar-inner">
          <Link to="/" className="mypage__back" aria-label="메인 지도로 돌아가기">
            ← 지도로
          </Link>
          <h1 className="mypage__title">마이페이지</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            로그아웃
          </Button>
        </div>
      </header>

      <div className="mypage__content">
        <ProfileSection user={user} />
        <PreferenceSection user={user} />
        <FavoritesSection />
        <ReviewsSection />
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Profile                                                                  */
/* -------------------------------------------------------------------------- */

function ProfileSection({ user }: { user: MeResponse }) {
  const display = (user.nickname && user.nickname.trim()) || user.username;
  const initial = display.slice(0, 1).toUpperCase();

  const meta: string[] = [];
  if (user.school && user.school.trim()) meta.push(user.school);
  if (user.year != null) meta.push(`${user.year}학년`);

  const handleEdit = () => {
    // Phase B: simple inline placeholder. Profile editing arrives later
    // (PATCH /api/users/me already wired in lib/api.ts).
    window.alert('프로필 편집은 추후 추가됩니다.');
  };

  return (
    <Card padding="lg" className="mypage__section">
      <div className="mypage__profile">
        <div className="mypage__avatar" aria-hidden="true">
          {initial}
        </div>
        <div className="mypage__profile-text">
          <div className="mypage__profile-name">{display}</div>
          <div className="mypage__profile-meta">
            {meta.length > 0 ? meta.join(' · ') : '학교·학년 정보를 추가해주세요.'}
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={handleEdit}>
          수정
        </Button>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Preference (weights)                                                     */
/* -------------------------------------------------------------------------- */

function PreferenceSection({ user }: { user: MeResponse }) {
  const navigate = useNavigate();
  const { w_rent, w_amenity, w_transit } = user.preference;

  const handleRelearn = () => {
    // Send the user back to the main map with a flag so it auto-opens the
    // PreferenceModal. MainMap handles ?onboarding=1.
    navigate('/?onboarding=1');
  };

  return (
    <Card padding="lg" className="mypage__section">
      <div className="mypage__section-head">
        <h2 className="mypage__section-title">내 가중치</h2>
        <button
          type="button"
          className="mypage__relearn"
          onClick={handleRelearn}
        >
          다시 학습하기 →
        </button>
      </div>
      <div className="mypage__bars">
        <MetricBar label="통학" value={w_transit} tone="weight" unit="%" />
        <MetricBar label="주거비" value={w_rent} tone="weight" unit="%" />
        <MetricBar label="생활시설" value={w_amenity} tone="weight" unit="%" />
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Favorites                                                                */
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
    <Card padding="lg" className="mypage__section">
      <div className="mypage__section-head">
        <h2 className="mypage__section-title">찜한 동네</h2>
        {items.length >= 2 && (
          <button
            type="button"
            className="mypage__relearn"
            onClick={handleCompareAll}
          >
            {Math.min(items.length, MAX_COMPARE)}개 모두 비교하기 →
          </button>
        )}
      </div>

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
    </Card>
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
/* 4. Reviews (empty)                                                          */
/* -------------------------------------------------------------------------- */

function ReviewsSection() {
  return (
    <Card padding="lg" className="mypage__section">
      <div className="mypage__section-head">
        <h2 className="mypage__section-title">내가 쓴 리뷰</h2>
      </div>
      <div className="mypage__empty">
        <p className="mypage__empty-text">아직 작성한 리뷰가 없어요.</p>
        <span className="mypage__empty-text--muted">
          동네 상세 페이지에서 자취 후기를 남길 수 있어요.
        </span>
      </div>
    </Card>
  );
}
