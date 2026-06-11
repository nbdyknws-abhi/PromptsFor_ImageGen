import React, { useState } from "react";
import { Menu, X, Image, Sparkles, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import UserAvatar from "./UserAvatar";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { name: "Gallery", icon: Image, href: "/gallery" },
    { name: "Generate", icon: Sparkles, href: "/generate" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20, duration: 0.8 }}
      className="fixed top-0 left-0 right-0 z-50 px-4 py-3 md:px-8"
    >
      <div className="max-w-7xl mx-auto">
        <div className="glass-panel rounded-2xl px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-zinc-100 font-bold text-xl group-hover:scale-105 transition-transform">
              PNX
            </div>
            <span className="font-bold text-lg text-white tracking-wide hidden sm:block">
              Prompt<span className="text-indigo-400">Nexus</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-2 text-sm font-medium tracking-wide transition-colors ${
                  isActive(item.href)
                    ? "text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <item.icon
                  size={16}
                  className={isActive(item.href) ? "text-indigo-400" : ""}
                />
                {item.name}
              </Link>
            ))}

            {/* Profile / Login */}
            {user ? (
              <Link
                to="/profile"
                className={`flex items-center gap-2 text-sm font-medium tracking-wide transition-colors ${
                  isActive("/profile") ? "text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                <UserAvatar user={user} size={28} />
                <span>{user.name?.split(" ")[0] || "Profile"}</span>
              </Link>
            ) : (
              <Link
                to="/auth"
                className={`flex items-center gap-2 text-sm font-medium tracking-wide transition-colors ${
                  isActive("/auth") ? "text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                <Lock size={16} className={isActive("/auth") ? "text-indigo-400" : ""} />
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-3">
            {user && <UserAvatar user={user} size={32} />}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-300 hover:text-white p-2"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-20 left-4 right-4 glass-panel bg-zinc-900/40 backdrop-blur-xl rounded-xl p-4 flex flex-col gap-2 md:hidden"
            >
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? "bg-white/10 text-white"
                      : "hover:bg-white/5 text-gray-200"
                  }`}
                >
                  <item.icon size={18} className={isActive(item.href) ? "text-indigo-400" : ""} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}

              {user ? (
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isActive("/profile") ? "bg-white/10 text-white" : "hover:bg-white/5 text-gray-200"
                  }`}
                >
                  <UserAvatar user={user} size={24} />
                  <span className="font-medium">Profile</span>
                </Link>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isActive("/auth") ? "bg-white/10 text-white" : "hover:bg-white/5 text-gray-200"
                  }`}
                >
                  <Lock size={18} className={isActive("/auth") ? "text-indigo-400" : ""} />
                  <span className="font-medium">Login</span>
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;
