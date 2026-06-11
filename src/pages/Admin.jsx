import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import UploadForm from "../components/UploadForm";
import { Key, Lock, Unlock, LogOut, ShieldAlert } from "lucide-react";

const ADMIN_PASSKEY = import.meta.env.VITE_UPLOAD_PASSKEY;

export default function Admin() {
  const [inputKey, setInputKey] = useState("");
  const [storedKey, setStoredKey] = useState("");
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check sessionStorage on mount
  useEffect(() => {
    const savedKey = sessionStorage.getItem("admin_passkey");
    if (savedKey === ADMIN_PASSKEY) {
      setStoredKey(savedKey);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");

    if (inputKey === ADMIN_PASSKEY) {
      sessionStorage.setItem("admin_passkey", inputKey);
      setStoredKey(inputKey);
      setIsAuthenticated(true);
      setInputKey("");
    } else {
      setError("Incorrect Access Key. Access Denied.");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_passkey");
    setStoredKey("");
    setIsAuthenticated(false);
  };

  return (
    <div className="py-12 px-4 max-w-6xl mx-auto min-h-[80vh] flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <motion.div
            key="login-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            <div className="glass-card rounded-2xl p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-indigo-500 to-purple-500" />
              
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock size={28} />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Admin Portal</h2>
              <p className="text-gray-400 text-sm mb-8">
                Enter your security access key to manage prompt database uploads.
              </p>

              <form onSubmit={handleLogin} className="space-y-6 text-left">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400 ml-1">
                    Security Passkey
                  </label>
                  <div className="relative">
                    <Key
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                      size={18}
                    />
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all font-mono"
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                    >
                      <ShieldAlert size={16} className="text-red-400 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all"
                >
                  Authenticate
                </motion.button>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="admin-content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full"
          >
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 w-full max-w-2xl mx-auto px-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/15 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center">
                  <Unlock size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                  <p className="text-xs text-green-400">Authenticated Session</p>
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 rounded-xl text-gray-300 hover:text-red-200 text-sm font-medium transition-all"
              >
                <LogOut size={16} />
                Lock Panel
              </motion.button>
            </div>

            <UploadForm prefilledPasskey={storedKey} onUploaded={() => {}} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
