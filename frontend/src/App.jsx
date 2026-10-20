import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login/Login"; 

import MainLayout from "./components/MainLayout";

import Dashboard from "./pages/Dashboard/Dashboard";
import Usuarios from "./pages/Administracion/Usuarios";
import Ventas from "./pages/Venta/Ventas";
import Categorias from "./pages/Categoria/Categorias";
import Inventario from "./pages/Inventario/Inventario";
import Utensilios from "./pages/Utensilios/Utensilios";
import Deudores from "./pages/Deudas/Deudores";
import MenuCafeteria from "./pages/Menu/MenuCafeteria";
import Recetas from "./pages/Receta/Recetas";

// Módulos públicos de Cliente
import ClienteLogin from "./pages/cliente/ClienteLogin";
import MiApartado from "./pages/cliente/MiApartado";
import HistorialVentas from "./pages/Ventas/HistorialVentas";
import Clientes from "./pages/Clientes/Clientes";
import CambiarPasswordCliente from "./pages/cliente/CambiarPasswordCliente";
import RecuperarPasswordCliente from "./pages/cliente/RecuperarPasswordCliente";
import RegistroClientePublico from "./pages/registro-cliente/RegistroClientePublico";
import ModalQRCliente from "./pages/registro-cliente/ModalQRCliente";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas Administrativas / Personal */}
          <Route path="/login" element={<Login />} />

          {/* Rutas Públicas de Cliente */}
          <Route path="/cliente/login" element={<ClienteLogin />} />
          <Route path="/cliente/mi-apartado" element={<MiApartado />} />
          <Route path="/cliente/cambiar-password" element={<CambiarPasswordCliente />} />
          <Route path="/cliente/recuperar" element={<RecuperarPasswordCliente />} />
          {/* Compatibilidad con el enlace anterior */}
          <Route path="/cliente/consulta" element={<MiApartado />} />
          <Route path="/cliente/tickets" element={<MiApartado />} />
          <Route path="/registro-cliente" element={<RegistroClientePublico />} />
          <Route path="/registro-cliente/qr" element={<ModalQRCliente open onClose={() => window.history.back()} />} />

          {/* Panel Principal Dashboard (Protegido) */}
          <Route path="/dashboard" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="categorias" element={<Categorias />} />
            <Route path="menu" element={<MenuCafeteria />} />
            <Route path="ventas" element={<Ventas />} />
            <Route path="historial-ventas" element={<HistorialVentas />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="inventario" element={<Inventario />} />
            <Route path="utensilios" element={<Utensilios />} />
            <Route path="recetas" element={<Recetas />} />
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