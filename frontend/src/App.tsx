import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ScrapProvider } from './context/ScrapContext';
import { MainLayout } from './layouts/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { MovimientosPage } from './pages/MovimientosPage';
import { MovimientoDetallePage } from './pages/MovimientoDetallePage';
import { AprobacionesPage } from './pages/AprobacionesPage';
import { MotivosPage } from './pages/MotivosPage';
import { FallasPorLineaPage } from './pages/FallasPorLineaPage';
import { ReportesPage } from './pages/ReportesPage';
import { ComparativaMensualPage } from './pages/ComparativaMensualPage';
import { ConfiguracionPage } from './pages/ConfiguracionPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ScrapProvider>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="movimientos" element={<MovimientosPage />} />
              <Route path="movimientos/:id" element={<MovimientoDetallePage />} />
              <Route path="aprobaciones" element={<AprobacionesPage />} />
              <Route path="motivos" element={<MotivosPage />} />
              <Route path="fallas-por-linea" element={<FallasPorLineaPage />} />
              <Route path="reportes" element={<ReportesPage />} />
              <Route path="comparativa-mensual" element={<ComparativaMensualPage />} />
              <Route path="configuracion" element={<ConfiguracionPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </ScrapProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
