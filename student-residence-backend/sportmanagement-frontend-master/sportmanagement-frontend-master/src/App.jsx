// src/App.js
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./components/Register";
import Login from "./components/Login";
import Home from "./components/Home";
import Landing from "./components/Landing";
import FacilitiesPage from "./components/FacilitiesPage";
import MaintenancePage from "./components/MaintenancePage";
import UserManagement from "./components/UserManagement";
import LoginSuccess from "./components/LoginSuccess";
import { AuthProvider } from "./components/auth/AuthContext";
import Dashboard from "./components/Dashboard";
import EventsManagement from "./components/EventsManagement";
import NotFound from "./components/NotFound"; // Import the new component

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
        <Route path="/register" element={<Register />} />
          <Route path="/home" element={<Home />} />
          <Route path="/" element={<Landing />} />
          <Route path="/facilities" element={<FacilitiesPage />} />
          <Route path="/report" element={<MaintenancePage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/management" element={<UserManagement />} />
          <Route path="/login" element={<Login />} />
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/events-management" element={<EventsManagement />} />
          <Route path="/login/success" element={<LoginSuccess />} />
          {/* Add this catch-all route at the end */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;