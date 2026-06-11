import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import FullGallery from "./pages/FullGallery";
import Generate from "./pages/Generate";
import Admin from "./pages/Admin";
import "./App.css";

import { AuthProvider } from "./context/AuthContext";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/gallery" element={<FullGallery />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </Router>
  );
}

export default App;
