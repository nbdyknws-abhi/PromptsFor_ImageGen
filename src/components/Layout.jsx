import React from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen text-gray-100 font-sans relative" id="top">
      {/* Animated Background */}
      <div className="mesh-gradient-bg" />

      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="relative z-20 pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto">
        {children}
      </main>
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Layout;
