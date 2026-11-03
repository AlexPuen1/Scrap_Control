import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ScrapProvider } from './context/ScrapContext';
import { DemoSessionProvider } from './context/DemoSessionProvider';
import { useDemoSession } from './context/demoSession';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MovimientosPage } from './pages/MovimientosPage';
import { MovimientoDetallePage } from './pages/MovimientoDetallePage';
import { AprobacionesPage } from './pages/AprobacionesPage';
import { MotivosPage } from './pages/MotivosPage';
import { FallasPorLineaPage } from './pages/FallasPorLineaPage';
import { ReportesPage } from './pages/ReportesPage';
import { ComparativaMensualPage } from './pages/ComparativaMensualPage';
import { ConfiguracionPage } from './pages/ConfiguracionPage';
import { FiltrosPage } from './pages/FiltrosPage';

const AppRoutes: React.FC = () => {
  const { usuario } = useDemoSession();
  if (!usuario) return <LoginPage />;

  const administrador = usuario.rol === 'Administrador';
  const inicio = administrador ? '/dashboard' : '/aprobaciones';
  return (
    <ScrapProvider>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to={inicio} replace />} />
          <Route path="dashboard" element={administrador ? <DashboardPage /> : <Navigate to="/aprobaciones" replace />} />
          <Route path="movimientos" element={<MovimientosPage />} />
          <Route path="movimientos/:id" element={<MovimientoDetallePage />} />
          <Route path="aprobaciones" element={<AprobacionesPage />} />
          <Route path="motivos" element={administrador ? <MotivosPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="fallas-por-linea" element={administrador ? <FallasPorLineaPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="reportes" element={administrador ? <ReportesPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="comparativa-mensual" element={administrador ? <ComparativaMensualPage /> : <Navigate to="/aprobaciones" replace />} />
          <Route path="filtros" element={administrador ? <FiltrosPage /> : <Navigate to="/aprobaciones" replace />} />
          <Route path="configuracion" element={administrador ? <ConfiguracionPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to={inicio} replace />} />
        </Route>
      </Routes>
    </ScrapProvider>
  );
};

export const App: React.FC = () => (
  <BrowserRouter>
    <ThemeProvider>
      <DemoSessionProvider>
        <AppRoutes />
      </DemoSessionProvider>
    </ThemeProvider>
  </BrowserRouter>
);

export default App;
