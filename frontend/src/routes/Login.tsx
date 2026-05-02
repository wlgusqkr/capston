// Login (`/login`) — username + password form.
//
// SPEC 8: route exists. SPEC requirement (step 9 task): no Kakao / social,
// just standard Django username/password against /api/auth/login.
//
// On success the AuthContext picks up the user and we navigate back to the
// previous page (or "/" if there is none).
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button, Input } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthErrorMessage } from '@/lib/authErrors';

import './Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

    setSubmitting(true);
    try {
      await login({ username: username.trim(), password });
      // Send the user back where they came from (e.g. /mypage redirect).
      // Avoid history loops; if there's no history, fall back to /.
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setErrorMsg(
        getAuthErrorMessage(err, '로그인에 실패했어요. 잠시 후 다시 시도해주세요.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth">
      <div className="auth__card" role="form" aria-labelledby="login-title">
        <Link to="/" className="auth__back" aria-label="메인 지도로 돌아가기">
          ← 지도로
        </Link>

        <div className="auth__brand">
          <span className="auth__brand-mark" aria-hidden="true">슬</span>
          <span className="auth__brand-text">슬기로운 자취생활</span>
        </div>

        <h1 id="login-title" className="auth__title">로그인</h1>
        <p className="auth__subtitle">
          아이디와 비밀번호로 로그인해주세요.
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
            placeholder="예: jihyeon"
            required
          />
          <Input
            label="비밀번호"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
          >
            로그인
          </Button>
        </form>

        <hr className="auth__divider" />

        <div className="auth__footer">
          <span>처음 오셨나요?</span>
          <Link to="/register" className="auth__footer-link">
            회원가입은 여기로 →
          </Link>
        </div>
      </div>
    </main>
  );
}
