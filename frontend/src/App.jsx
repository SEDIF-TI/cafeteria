import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Importa tu layout principal desde la carpeta components
import MainLayout from "./components/MainLayout";

// Importa las vistas según la ruta real de tus carpetas
import Usuarios from "./pages/Administracion/Usuarios";
import Ventas from "./pages/Venta/Ventas";
import Categorias from "./pages/Categorias/Categorias";
import Inventario from "./pages/Inventario/Inventario";
import Deudores from "./pages/Deudas/Deudores";

// Vistas pendientes (placeholder rápido para que no rompa rutas)
const DashboardHome = () => <h2>Bienvenido al Panel de Operaciones</h2>;
const MenuCafeteria = () => <h2>Gestión de Menú de Cafetería</h2>;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirección inicial a la ruta por defecto */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Layout principal que envuelve el Dashboard y el Sidebar */}
        <Route path="/dashboard" element={<MainLayout />}>
          {/* Ruta índice del dashboard */}
          <Route index element={<DashboardHome />} />
          
          {/* Módulo de Categorías */}
          <Route path="categorias" element={<Categorias />} />
          
          {/* Módulo de Menú */}
          <Route path="menu" element={<MenuCafeteria />} />
          
          {/* Módulo de Ventas y Caja */}
          <Route path="ventas" element={<Ventas />} />
          
          {/* Módulo de Inventario */}
          <Route path="inventario" element={<Inventario />} />
          
          {/* Módulo de Personal / Usuarios */}
          <Route path="usuarios" element={<Usuarios />} />

          {/* Módulo de Deudores / Adeudos */}
          <Route path="deudores" element={<Deudores />} />
        </Route>

        {/* Ruta por si escriben cualquier otra cosa */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}