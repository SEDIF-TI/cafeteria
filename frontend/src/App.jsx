import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login/Login"; 

import MainLayout from "./components/MainLayout";

import Usuarios from "./pages/Administracion/Usuarios";
import Ventas from "./pages/Venta/Ventas";
import Categorias from "./pages/Categorias/Categorias";
import Inventario from "./pages/Inventario/Inventario";
import Deudores from "./pages/Deudas/Deudores";

const DashboardHome = () => <h2>Bienvenido al Panel de Operaciones</h2>;
const MenuCafeteria = () => <h2>Gestión de Menú de Cafetería</h2>;

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/dashboard" element={<MainLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="categorias" element={<Categorias />} />
            <Route path="menu" element={<MenuCafeteria />} />
            <Route path="ventas" element={<Ventas />} />
            <Route path="inventario" element={<Inventario />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="deudores" element={<Deudores />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}