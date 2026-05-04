// MyPage (`/mypage`) — SPEC 6.6.
//
// R-4 (design-polish-v2.md): rebuilt as a 2-column workspace.
//   LEFT rail (sticky)   — Profile + MY WEIGHTS
//   RIGHT column (scroll) — MY FAVORITES + MY REVIEWS
//
// R-4 phase B: inline edit on profile (NOT modal — modal is for transient
// flows), hover-reveal × on favorites with inline confirm, weights empty
// state with primary action when default-weighted.
import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { Badge, Button, Input, MetricBar, Select } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites, useRemoveFavorite } from '@/hooks/useFavorites';
import { patchMe } from '@/lib/api';
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
/* Profile (LEFT rail, top) — view + inline edit                              */
/* -------------------------------------------------------------------------- */

function ProfileSection({ user }: { user: MeResponse }) {
  const [editing, setEditing] = useState(false);

  return (
    <section className="mypage__profile" aria-labelledby="profile-heading">
      <p className="mono-label" aria-hidden="true">PROFILE</p>
      {editing ? (
        <ProfileEditForm
          user={user}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      ) : (
        <ProfileView user={user} onEdit={() => setEditing(true)} />
      )}
    </section>
  );
}

function ProfileView({ user, onEdit }: { user: MeResponse; onEdit: () => void }) {
  const display = (user.nickname && user.nickname.trim()) || user.username;
  const meta: string[] = [];
  if (user.school && user.school.trim()) meta.push(user.school);
  if (user.year != null) meta.push(`${user.year}학년`);

  return (
    <>
      <h2 id="profile-heading" className="mypage__display-name">
        {display}
      </h2>
      <p className="mypage__profile-meta">
        {meta.length > 0 ? meta.join(' · ') : '학교·학년 정보를 추가해주세요.'}
      </p>
      <div>
        <Button variant="secondary" size="sm" onClick={onEdit}>
          수정
        </Button>
      </div>
    </>
  );
}

const YEAR_OPTIONS = [
  { value: '', label: '학년 미입력' },
  { value: '1', label: '1학년' },
  { value: '2', label: '2학년' },
  { value: '3', label: '3학년' },
  { value: '4', label: '4학년' },
  { value: '5', label: '5학년 이상' },
];

interface ProfileEditFormProps {
  user: MeResponse;
  onCancel: () => void;
  onSaved: () => void;
}

function ProfileEditForm({ user, onCancel, onSaved }: ProfileEditFormProps) {
  const { refresh } = useAuth();
  const [nickname, setNickname] = useState(user.nickname);
  const [school, setSchool] = useState(user.school);
  const [year, setYear] = useState<string>(
    user.year != null ? String(user.year) : '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await patchMe({
        nickname: nickname.trim(),
        school: school.trim(),
        year: year === '' ? null : Number(year),
      });
      await refresh();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="mypage__profile-form" onSubmit={handleSubmit}>
      <h2 id="profile-heading" className="sr-only">
        프로필 수정
      </h2>
      <label className="mypage__field">
        <span className="mypage__field-label">닉네임</span>
        <Input
          name="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="예: jihyeon"
          maxLength={20}
        />
      </label>
      <label className="mypage__field">
        <span className="mypage__field-label">학교</span>
        <Input
          name="school"
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          placeholder="예: 동국대"
          maxLength={30}
        />
      </label>
      <label className="mypage__field">
        <span className="mypage__field-label">학년</span>
        <Select
          name="year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          {YEAR_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </label>
      {error && (
        <p className="mypage__field-error" role="alert">
          {error}
        </p>
      )}
      <div className="mypage__form-actions">
        <Button type="submit" variant="primary" size="sm" loading={saving}>
          저장
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCancel}
          disabled={saving}
        >
          취소
        </Button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Preference (LEFT rail, bottom)                                              */
/* -------------------------------------------------------------------------- */

/** Default weights (matches DEFAULT_WEIGHTS / backend default for unlearned
 *  users). Treat the user's stored preference as "empty" only when it
 *  exactly matches this triple — that way custom weights summing to the
 *  same percentages are still rendered as bars (per R-4 empty-state spec). */
const DEFAULT_W = { rent: 33, amenity: 33, transit: 34 };

function PreferenceSection({ user }: { user: MeResponse }) {
  const navigate = useNavigate();
  const { w_rent, w_amenity, w_transit } = user.preference;

  const isDefault =
    w_rent === DEFAULT_W.rent &&
    w_amenity === DEFAULT_W.amenity &&
    w_transit === DEFAULT_W.transit;

  const handleStartLearning = () => navigate('/?onboarding=1');
  const handleRelearn = () => navigate('/?onboarding=1');

  if (isDefault) {
    return (
      <section className="mypage__weights" aria-labelledby="weights-heading">
        <p className="mono-label" aria-hidden="true">MY WEIGHTS</p>
        <h2 id="weights-heading" className="mypage__section-heading">
          내 자취 기준
        </h2>
        <div className="mypage__empty">
          <p className="mypage__empty-text">
            선호 학습을 시작하면 자동으로 채워져요.
          </p>
          <div>
            <Button variant="primary" size="sm" onClick={handleStartLearning}>
              선호 학습 시작 →
            </Button>
          </div>
        </div>
      </section>
    );
  }

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
    [items],
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
          <div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/')}
            >
              메인 지도 →
            </Button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <ul className="mypage__fav-list">
          {items.map((fav) => (
            <FavoriteRow
              key={fav.slug}
              item={fav}
              onOpen={() => navigate(`/dong/${fav.slug}`)}
              onConfirmRemove={() => removeMut.mutate(fav.slug)}
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
  onConfirmRemove: () => void;
  removing: boolean;
}

function FavoriteRow({
  item,
  onOpen,
  onConfirmRemove,
  removing,
}: FavoriteRowProps) {
  const score = Math.round(item.score);
  const variant = score >= 70 ? 'success' : score >= 40 ? 'warning' : 'danger';
  const [confirming, setConfirming] = useState(false);

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
      {confirming ? (
        <span className="mypage__fav-confirm" role="alertdialog" aria-label="찜 해제 확인">
          <span className="mypage__fav-confirm-prompt">확실해요?</span>
          <button
            type="button"
            className="mypage__fav-confirm-yes"
            onClick={(e) => {
              e.stopPropagation();
              onConfirmRemove();
            }}
            disabled={removing}
          >
            예
          </button>
          <button
            type="button"
            className="mypage__fav-confirm-no"
            onClick={(e) => {
              e.stopPropagation();
              setConfirming(false);
            }}
            disabled={removing}
          >
            아니요
          </button>
        </span>
      ) : (
        <button
          type="button"
          className="mypage__fav-remove"
          onClick={(e) => {
            e.stopPropagation();
            setConfirming(true);
          }}
          aria-label={`${item.name} 찜 해제`}
          disabled={removing}
        >
          × 찜 해제
        </button>
      )}
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
        <p className="mypage__empty-text">
          동네 상세에서 리뷰를 남겨보세요.
        </p>
      </div>
    </section>
  );
}
