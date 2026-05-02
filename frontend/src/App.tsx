// Top-level router. Screens registered here per SPEC section 8.
//   /                       → MainMap (4단계)
//   /dong/:slug             → DongDetail (6단계)
//   /compare?dongs=A,B,C    → Compare (8단계)
//   /login                  → Login (9단계, username/password)
//   /register               → Register (9단계)
//   /mypage                 → MyPage (9단계, SPEC 6.6)
//   /onboarding             → preference modal (7단계)
import { Route, Routes } from 'react-router-dom';

import Compare from './routes/Compare';
import DongDetail from './routes/DongDetail';
import Login from './routes/Login';
import MainMap from './routes/MainMap';
import MyPage from './routes/MyPage';
import NotFound from './routes/NotFound';
import Register from './routes/Register';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainMap />} />
      <Route path="/dong/:slug" element={<DongDetail />} />
      <Route path="/compare" element={<Compare />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/mypage" element={<MyPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
