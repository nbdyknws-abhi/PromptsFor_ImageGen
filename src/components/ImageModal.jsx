import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Copy, Check, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function ImageModal({ photo, onClose }) {
  const [copied, setCopied] = useState(false);
  const { user, toggleSavePhoto, saved } = useAuth();
  const isSaved = photo ? saved.includes(photo.id || photo.$id) : false;

  // Lock body scroll when modal is open
  useEffect(() => {
    if (photo) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("modal-open");
    } else {
      document.body.style.overflow = "unset";
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.style.overflow = "unset";
      document.body.classList.remove("modal-open");
    };
  }, [photo]);

  if (!photo) return null;

  const handleToggleSave = async (e) => {
    e.stopPropagation();
    if (!user) return;
    await toggleSavePhoto(photo.id || photo.$id);
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(photo.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {photo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-8"
          onClick={handleBackdropClick}
        >
          <motion.div
            layoutId={`card-${photo.id || photo.$id}`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative max-w-6xl w-full max-h-[95vh] md:max-h-[90vh] bg-[#18181b] rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row border border-white/10 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Section */}
            <div className="flex-1 bg-black flex items-center justify-center relative group cursor-zoom-in">
              <img
                src={photo.url}
                alt={photo.prompt}
                className="max-h-[40vh] md:max-h-[90vh] w-full object-contain"
              />
              <button
                onClick={onClose}
                className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md md:hidden transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sidebar / Info Section */}
            <div className="w-full md:w-[400px] flex-1 md:flex-none p-5 md:p-6 flex flex-col bg-[#18181b] border-l border-white/5 overflow-hidden cursor-default">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="text-xl font-bold text-white">Image Details</h3>
                <button
                  onClick={onClose}
                  className="hidden md:flex p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">
                    Prompt
                  </h4>
                  <p className="text-gray-200 leading-relaxed font-light text-lg">
                    {photo.prompt}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 md:pt-6 mt-auto border-t border-white/10 flex flex-col gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={copyPrompt}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all active:scale-95 cursor-pointer"
                  >
                    {copied ? (
                      <Check size={18} className="text-green-400" />
                    ) : (
                      <Copy size={18} />
                    )}
                    {copied ? "Prompt Copied" : "Copy"}
                  </button>

                  {user && (
                    <button
                      onClick={handleToggleSave}
                      className={`flex items-center justify-center gap-2 px-6 py-3 border rounded-xl font-medium transition-all active:scale-95 cursor-pointer ${
                        isSaved
                          ? "bg-pink-500/20 border-pink-500/50 text-pink-500"
                          : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                      }`}
                    >
                      <Heart
                        size={18}
                        fill={isSaved ? "currentColor" : "none"}
                      />
                      {isSaved ? "Saved" : "Save"}
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  <a
                    href={photo.url}
                    download={`ai-generated-${photo.id || "image"}.jpg`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20 cursor-pointer"
                  >
                    <ExternalLink size={18} />
                    See Full Image
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
