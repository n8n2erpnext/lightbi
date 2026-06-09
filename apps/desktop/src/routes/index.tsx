import { createBrowserRouter, Navigate, useRouteError, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Home } from '../pages/Home';
import { Dashboards } from '../pages/Dashboards';
import { DashboardBuilder } from '../pages/DashboardBuilder';
import { Charts } from '../pages/Charts';
import { ChartBuilder } from '../pages/ChartBuilder';
import { Datasets } from '../pages/Datasets';
import { DataSources } from '../pages/DataSources';
import { Settings } from '../pages/Settings';

const RouteError = () => {
  const error = useRouteError() as Error;
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50 p-6 font-sans">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 max-w-md w-full flex flex-col items-center text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-600 mb-6">
          {error?.message || 'An unexpected error occurred while rendering this page.'}
        </p>
        <button 
          onClick={() => {
            navigate('/');
            window.location.reload();
          }}
          className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/dashboards', element: <Dashboards /> },
      { path: '/dashboards/:id', element: <DashboardBuilder /> },
      { path: '/charts', element: <Charts /> },
      { path: '/charts/new', element: <ChartBuilder /> },
      { path: '/charts/:id', element: <ChartBuilder /> },
      { path: '/datasets', element: <Datasets /> },
      { path: '/datasources', element: <DataSources /> },
      { path: '/settings', element: <Settings /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
