import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchPhotosByIds } from "../api/photos";
import PhotoCard from "../components/PhotoCard";
import ImageModal from "../components/ImageModal";
import { useNavigate } from "react-router-dom";
import { LogOut, Heart, User, Loader2, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function Profile() {
  const { user, logout, saved, loading: authLoading } = useAuth();
  const [savedPhotos, setSavedPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

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

    if (user) {
      loadSaved();
    }
  }, [user, saved]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
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
    <div className="max-w-7xl mx-auto px-4 py-8 md:px-8">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 rounded-3xl mb-12 relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <User size={48} className="text-white" />
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold text-white mb-2">{user.name}</h1>
            <p className="text-gray-400 mb-4">{user.email}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-sm text-gray-300 flex items-center gap-2">
                <Heart size={16} className="text-pink-500" />
                <span>{savedPhotos.length} Saved Photos</span>
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

      {/* Saved Photos Grid */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ImageIcon className="text-indigo-400" />
          <h2 className="text-2xl font-bold text-white">Your Saved Gallery</h2>
        </div>

        {savedPhotos.length === 0 ? (
          <div className="glass-panel py-20 rounded-3xl text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart size={32} className="text-gray-600" />
            </div>
            <p className="text-gray-400 mb-2">
              You haven't saved any photos yet.
            </p>
            <p className="text-sm text-gray-600">
              Explore the gallery and heart the ones you love!
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {savedPhotos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onClick={() => setSelectedPhoto(photo)}
              />
            ))}
          </div>
        )}
      </div>

      <ImageModal
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />
    </div>
  );
}
