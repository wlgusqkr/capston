// Top-level router. Screens registered here per SPEC section 8.
//   /                       → MainMap (4단계)
//   /dong/:slug             → DongDetail (6단계)
//   /compare?dongs=A,B,C    → Compare (8단계)
//   /mypage                 → MyPage (later)
//   /onboarding             → preference modal (7단계)
import { Route, Routes } from 'react-router-dom';

import Compare from './routes/Compare';
import DongDetail from './routes/DongDetail';
import MainMap from './routes/MainMap';
import NotFound from './routes/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainMap />} />
      <Route path="/dong/:slug" element={<DongDetail />} />
      <Route path="/compare" element={<Compare />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
