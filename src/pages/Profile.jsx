import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchPhotosByIds } from "../api/photos";
import { getGenerationHistory, deleteGenerationEntry, formatExpiry } from "../api/generationHistory";
import PhotoCard from "../components/PhotoCard";
import ImageModal from "../components/ImageModal";
import { useNavigate } from "react-router-dom";
import {
  LogOut, Heart, User, Loader2, Image as ImageIcon,
  Clock, Download, Trash2, Sparkles, AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Profile() {
  const { user, logout, saved, loading: authLoading } = useAuth();
  const [savedPhotos, setSavedPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const navigate = useNavigate();

  // Recent generations state
  const [recentGens, setRecentGens] = useState([]);
  const [gensLoading, setGensLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Load saved gallery photos
  useEffect(() => {
    const loadSaved = async () => {
      if (!user) return;
      if (saved.length === 0) {
        setSavedPhotos([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const photos = await fetchPhotosByIds(saved);
        setSavedPhotos(photos);
      } catch (error) {
        console.error("Error loading profile data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (user) loadSaved();
  }, [user, saved]);

  // Load recent generations from IndexedDB
  const loadRecentGens = useCallback(async () => {
    if (!user) return;
    setGensLoading(true);
    try {
      const uid = user.$id || "anon";
      const entries = await getGenerationHistory(uid);
      setRecentGens(entries);
    } catch (err) {
      console.error("Error loading generation history:", err);
    } finally {
      setGensLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadRecentGens();
  }, [user, loadRecentGens]);

  // Refresh expiry labels every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setRecentGens((prev) => [...prev]); // trigger re-render for expiry label
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleDeleteGen = async (entry) => {
    setDeletingId(entry.id);
    try {
      await deleteGenerationEntry(entry.id);
      // Revoke object URL to free memory
      URL.revokeObjectURL(entry.objectUrl);
      setRecentGens((prev) => prev.filter((e) => e.id !== entry.id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadGen = async (entry) => {
    const link = document.createElement("a");
    link.href = entry.objectUrl;
    link.download = `generation-${entry.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading || (loading && user)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:px-8 space-y-12">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 rounded-3xl relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <User size={48} className="text-white" />
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold text-white mb-2">{user.name}</h1>
            <p className="text-gray-400 mb-4">{user.email}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-sm text-gray-300 flex items-center gap-2">
                <Heart size={16} className="text-pink-500" />
                <span>{savedPhotos.length} Saved Photos</span>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-sm text-gray-300 flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-400" />
                <span>{recentGens.length} Recent Generations</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all font-medium cursor-pointer"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>

        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
      </motion.div>

      {/* ─── Recent Generations Section ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="text-purple-400" size={22} />
            <h2 className="text-2xl font-bold text-white">Recent Generations</h2>
          </div>
          <span className="text-xs text-gray-500 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Clock size={12} />
            Auto-deleted after 7 days
          </span>
        </div>

        {/* Notice banner */}
        <div className="bg-amber-500/8 border border-amber-500/15 rounded-xl px-4 py-3 flex items-start gap-2.5 text-xs text-amber-200/80">
          <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p>
            These images are stored <strong className="text-amber-200">only on this device</strong> and will be
            automatically deleted after <strong className="text-amber-200">7 days</strong> unless you download them to
            your device or save them to the gallery above.
          </p>
        </div>

        {gensLoading ? (
          <div className="glass-panel py-16 rounded-3xl flex items-center justify-center">
            <Loader2 className="animate-spin text-purple-400" size={32} />
          </div>
        ) : recentGens.length === 0 ? (
          <div className="glass-panel py-20 rounded-3xl text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={32} className="text-gray-600" />
            </div>
            <p className="text-gray-400 mb-2">No recent generations yet.</p>
            <p className="text-sm text-gray-600">
              Images you generate will appear here for 7 days.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {recentGens.map((entry) => {
                const expiryLabel = formatExpiry(entry.expiresAt);
                const msLeft = entry.expiresAt - Date.now();
                const urgentSoon = msLeft < 24 * 60 * 60 * 1000; // <1 day

                return (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group relative rounded-2xl overflow-hidden border border-white/10 bg-black/20 aspect-square"
                  >
                    <img
                      src={entry.objectUrl}
                      alt={entry.prompt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Expiry badge */}
                    <div
                      className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold backdrop-blur-sm border ${
                        urgentSoon
                          ? "bg-red-500/20 border-red-500/30 text-red-300"
                          : "bg-black/40 border-white/10 text-gray-300"
                      }`}
                    >
                      <Clock size={9} />
                      {expiryLabel}
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                        <p className="text-[11px] text-gray-300 line-clamp-2 leading-relaxed">
                          {entry.prompt}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownloadGen(entry)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            title="Save to device"
                          >
                            <Download size={12} />
                            Save
                          </button>
                          <button
                            onClick={() => handleDeleteGen(entry)}
                            disabled={deletingId === entry.id}
                            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/20 text-red-300 rounded-lg text-xs transition-colors cursor-pointer"
                            title="Delete"
                          >
                            {deletingId === entry.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* ─── Saved Gallery Section ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-5"
      >
        <div className="flex items-center gap-3">
          <ImageIcon className="text-indigo-400" size={22} />
          <h2 className="text-2xl font-bold text-white">Your Saved Gallery</h2>
        </div>

        {savedPhotos.length === 0 ? (
          <div className="glass-panel py-20 rounded-3xl text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart size={32} className="text-gray-600" />
            </div>
            <p className="text-gray-400 mb-2">You haven't saved any photos yet.</p>
            <p className="text-sm text-gray-600">
              Explore the gallery and heart the ones you love!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {savedPhotos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onClick={() => setSelectedPhoto(photo)}
              />
            ))}
          </div>
        )}
      </motion.div>

      <ImageModal
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />
    </div>
  );
}
