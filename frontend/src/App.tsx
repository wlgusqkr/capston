// Top-level router. Screens registered here per SPEC section 8.
//   /                       → MainMap (4단계)
//   /dashboard              → Dashboard (Phase 0 shell)
//   /adong/:slug             → AdongDetail (6단계)
//   /compare?adongs=A,B,C    → Compare (8단계)
//   /login                  → Login (9단계, username/password)
//   /register               → Register (9단계)
//   /mypage                 → MyPage (9단계, SPEC 6.6)
//   /onboarding             → preference modal (7단계)
//
// Stage 3: <TopNav> renders above every route. <PageTitleProvider> lets
// individual pages publish their title to the contextual TopNav center
// zone (D-2 + R-2 design-polish-v2 plan).
//
// AiPanelProvider wraps AppContent + AiSidePanel so that the main content
// area can shift left when the AI panel opens (margin-right transition).
import { lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

import AiSidePanel from './components/Layout/AiSidePanel';
import TopNav from './components/Layout/TopNav';
import { AiPanelProvider, useAiPanel } from './contexts/AiPanelContext';
import { PageTitleProvider } from './contexts/PageTitleContext';
import CartesianPresentation from './routes/CartesianPresentation';
import Compare from './routes/Compare';
import CobaltPresentation from './routes/CobaltPresentation';
import CreativePresentation from './routes/CreativePresentation';
import DesignSystem from './routes/DesignSystem';
import AdongDetail from './routes/AdongDetail';
import AdongExplore from './routes/AdongExplore';
import Login from './routes/Login';
import MainMap from './routes/MainMap';
import MyPage from './routes/MyPage';
import NotFound from './routes/NotFound';
import Presentation from './routes/Presentation';
import Register from './routes/Register';

const Dashboard = lazy(() => import('./routes/Dashboard'));

function AppContent() {
  const { isOpen } = useAiPanel();
  const location = useLocation();
  const isPresentation = location.pathname === '/presentation';
  const isCobaltPresentation = location.pathname === '/presentation-cobalt';
  const isCreativePresentation = location.pathname === '/presentation-creative';
  const isCartesianPresentation = location.pathname === '/presentation-cartesian';

  if (isPresentation) {
    return <Presentation />;
  }

  if (isCobaltPresentation) {
    return <CobaltPresentation />;
  }

  if (isCreativePresentation) {
    return <CreativePresentation />;
  }

  if (isCartesianPresentation) {
    return <CartesianPresentation />;
  }

  return (
    <div
      className={`transition-[margin] duration-300 ease-out ${isOpen ? 'mr-[400px]' : ''}`}
    >
      <TopNav />
      <Routes>
        <Route path="/" element={<MainMap />} />
        <Route
          path="/dashboard"
          element={
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-[calc(100vh-var(--space-14))]">
                  <span className="text-text-muted text-caption">
                    로딩 중...
                  </span>
                </div>
              }
            >
              <Dashboard />
            </Suspense>
          }
        />
        <Route path="/adong/:slug" element={<AdongDetail />} />
        <Route path="/adong/:slug/explore" element={<AdongExplore />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/design-system" element={<DesignSystem />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isPresentation =
    location.pathname === '/presentation' ||
    location.pathname === '/presentation-cobalt' ||
    location.pathname === '/presentation-creative' ||
    location.pathname === '/presentation-cartesian';

  return (
    <PageTitleProvider>
      <AiPanelProvider>
        <AppContent />
        {!isPresentation && <AiSidePanel />}
      </AiPanelProvider>
    </PageTitleProvider>
  );
}
