// Register (`/register`) — username/password (+ school/year/nickname optional).
//
// Backend auto-logs in on success (step9a). AuthContext.register() also
// falls back to a follow-up login if that ever changes. After success we
// land on /mypage so the user immediately sees their new account.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button, Input } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthErrorMessage } from '@/lib/authErrors';

import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [school, setSchool] = useState('');
  const [year, setYear] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    setErrorMsg(null);

    if (!username.trim() || !password) {
      setErrorMsg('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    let yearNum: number | null = null;
    if (year.trim()) {
      const parsed = Number(year);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 8) {
        setErrorMsg('학년은 1~8 사이의 숫자여야 해요.');
        return;
      }
      yearNum = Math.trunc(parsed);
    }

    setSubmitting(true);
    try {
      await register({
        username: username.trim(),
        password,
        // Send only when filled so backend defaults stay clean.
        ...(nickname.trim() ? { nickname: nickname.trim() } : {}),
        ...(school.trim() ? { school: school.trim() } : {}),
        ...(yearNum != null ? { year: yearNum } : {}),
      });
      navigate('/mypage', { replace: true });
    } catch (err) {
      setErrorMsg(
        getAuthErrorMessage(err, '회원가입에 실패했어요. 입력값을 다시 확인해주세요.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth" id="main">
      <div className="auth__card" role="form" aria-labelledby="register-title">
        {/* In-card brand mark + back link removed in Stage 3 — global TopNav
         *  handles both. Auth-route TopNav variant (D-8) shows only logo +
         *  로그인 → on /register. */}
        <h1 id="register-title" className="auth__title">회원가입</h1>
        <p className="auth__subtitle">
          아이디와 비밀번호만 입력해도 가입할 수 있어요. 나머지는 마이페이지에서
          나중에 채워도 OK.
        </p>

        {errorMsg && (
          <div className="auth__error" role="alert">
            {errorMsg}
          </div>
        )}

        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          <Input
            label="아이디"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="영문/숫자 4자 이상"
            required
          />
          <Input
            label="비밀번호"
            type="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8자 이상 권장"
            required
          />
          <Input
            label="닉네임 (선택)"
            name="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="비워두면 아이디로 표시돼요"
          />
          <Input
            label="학교 (선택)"
            name="school"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="예: 동국대학교"
          />
          <Input
            label="학년 (선택)"
            type="number"
            inputMode="numeric"
            min={1}
            max={8}
            name="year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="예: 3"
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
          >
            가입하고 시작하기
          </Button>
        </form>

        <hr className="auth__divider" />

        <div className="auth__footer">
          <span>이미 계정이 있으신가요?</span>
          <Link to="/login" className="auth__footer-link">
            로그인하기 →
          </Link>
        </div>
      </div>
    </main>
  );
}
