import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layout principal
import MainLayout from "./components/MainLayout";

// Páginas Públicas
import Login from "./pages/Login/Login"; 
import RegistroClientePublico from "./pages/registro-cliente/RegistroClientePublico";
import ClienteLogin from "./pages/cliente/ClienteLogin";
import ConsultaTickets from "./pages/cliente/ConsultaTickets";

// Páginas Privadas del Dashboard
import Usuarios from "./pages/Administracion/Usuarios";
import Categorias from "./pages/Categoria/Categorias";
import Deudores from "./pages/Deudas/Deudores";
import Inventario from "./pages/Inventario/Inventario";
import MenuCafeteria from "./pages/Menu/MenuCafeteria";
import Recetas from "./pages/Receta/Recetas";
import Ventas from "./pages/Venta/Ventas";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/Login" element={<Navigate to="/login" replace />} />
        <Route path="/registro-cliente" element={<RegistroClientePublico />} />
        <Route path="/cliente/login" element={<ClienteLogin />} />
        <Route path="/cliente/tickets" element={<ConsultaTickets />} />

        {/* Panel de Operación */}
        <Route path="/dashboard" element={<MainLayout />}>
          <Route index element={<MenuCafeteria />} /> 
          
          <Route path="categorias" element={<Categorias />} />
          <Route path="menu" element={<MenuCafeteria />} />
          <Route path="ventas" element={<Ventas />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="recetas" element={<Recetas />} />
          
          {/* Mapeos para la vista de usuarios/personal */}
          <Route path="personal" element={<Usuarios />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="deudores" element={<Deudores />} />
        </Route>

        {/* Redirecciones */}
        <Route path="/" element={<Navigate to="/cliente/login" replace />} />
        <Route path="*" element={<Navigate to="/cliente/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}