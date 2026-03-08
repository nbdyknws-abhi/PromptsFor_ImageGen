import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ExternalLink, Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function PhotoCard({ photo, onClick }) {
  const [copied, setCopied] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const copyPrompt = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(photo.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = photo.prompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const { toggleSavePhoto, user, saved } = useAuth();
  const isSaved = saved.includes(photo.id || photo.$id);

  const handleToggleSave = async (e) => {
    e.stopPropagation();
    if (!user) return;
    await toggleSavePhoto(photo.id || photo.$id);
  };

  const openFull = (e) => {
    e.stopPropagation();
    window.open(photo.url, "_blank");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative break-inside-avoid mb-4 glass-card rounded-2xl overflow-hidden cursor-pointer"
      onClick={() => onClick && onClick(photo)}
    >
      {/* Image Container */}
      <div className="relative overflow-hidden bg-white/5 min-h-[100px]">
        {/* Skeleton Shimmer */}
        <AnimatePresence>
          {!isLoaded && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10"
            >
              <div className="w-full h-full bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] animate-shimmer" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.img
          src={photo.url}
          alt={photo.prompt}
          initial={{ opacity: 0, filter: "blur(10px)" }}
          animate={{
            opacity: isLoaded ? 1 : 0,
            filter: isLoaded ? "blur(0px)" : "blur(10px)",
            scale: isLoaded ? 1 : 1.1,
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          onLoad={() => setIsLoaded(true)}
          className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />

        {/* Overlay Gradient on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Action Buttons */}
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
          {user && (
            <button
              onClick={handleToggleSave}
              className={`p-2 rounded-full border backdrop-blur-md transition-all shadow-lg cursor-pointer ${
                isSaved
                  ? "bg-pink-500/20 border-pink-500/50 text-pink-500"
                  : "bg-white/10 border-white/10 text-white hover:bg-white/20"
              }`}
              title={isSaved ? "Remove from Favorites" : "Save to Favorites"}
            >
              <Heart size={16} fill={isSaved ? "currentColor" : "none"} />
            </button>
          )}
          <button
            onClick={copyPrompt}
            className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white transition-colors border border-white/10 shadow-lg cursor-pointer"
            title="Copy Prompt"
          >
            {copied ? (
              <Check size={16} className="text-green-400" />
            ) : (
              <Copy size={16} />
            )}
          </button>
          <button
            onClick={openFull}
            className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white transition-colors border border-white/10 shadow-lg cursor-pointer"
            title="View Full"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 relative">
        <p className="text-sm text-gray-300 font-medium line-clamp-2 md:line-clamp-3 leading-relaxed">
          {photo.prompt}
        </p>

        {/* Hover Reveal Details */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span>AI Generated</span>
          <span className="bg-white/5 px-2 py-0.5 rounded">High Quality</span>
        </div>
      </div>
    </motion.div>
  );
}
