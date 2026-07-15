import { useEffect } from 'react';
import { createHashRouter, RouterProvider, Outlet, useLocation } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { BrowsePage } from '../pages/BrowsePage';
import { FavoritesPage } from '../pages/FavoritesPage';
import { useIframe } from '../hooks/useIframeListener';
import { useFavoritesNotifications } from '../hooks/useFavoritesNotifications';

const LAST_ROUTE_KEY = 'brs-last-route';

const _startRoute = new URLSearchParams(window.location.search).get('_route');
if (_startRoute) {
  window.location.hash = _startRoute;
} else if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
  const saved = localStorage.getItem(LAST_ROUTE_KEY);
  if (saved && saved !== '/') window.location.hash = saved;
}

function Layout() {
  useIframe();
  useFavoritesNotifications();
  const { pathname } = useLocation();
  useEffect(() => {
    localStorage.setItem(LAST_ROUTE_KEY, pathname);
  }, [pathname]);
  return (
    <>
      <TopBar />
      <Outlet />
    </>
  );
}

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true,          element: <FavoritesPage /> },
      { path: 'browse',      element: <BrowsePage /> },
    ],
  },
]);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}
