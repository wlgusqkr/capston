// Top-level router. Screens registered here per SPEC section 8.
//   /                       → MainMap (이번 4단계)
//   /dong/:slug             → DongDetail (5단계 이후)
//   /compare                → Compare (8단계)
//   /mypage                 → MyPage (8단계)
//   /onboarding             → preference modal (7단계)
import { Route, Routes } from 'react-router-dom';

import MainMap from './routes/MainMap';
import NotFound from './routes/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainMap />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
