import { useState, useRef } from "react";
import { uploadPhoto } from "../api/photos";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  Upload,
  X,
  Check,
  Loader2,
  Image as ImageIcon,
  Key,
} from "lucide-react";

const PASSKEY = import.meta.env.VITE_UPLOAD_PASSKEY;

export default function UploadForm({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [passkey, setPasskey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef();

  const { user } = useAuth();

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      setFile(droppedFile);
      setError("");
    } else {
      setError("Only image files allowed");
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      setFile(selectedFile);
      setError("");
    } else {
      setError("Only image files allowed");
      setFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (passkey !== PASSKEY) {
      setError("Incorrect passkey. Please contact admin.");
      return;
    }
    if (!file || !prompt) {
      setError("Please select an image and enter a prompt.");
      return;
    }
    setLoading(true);
    try {
      await uploadPhoto(file, prompt, user?.$id);
      setFile(null);
      setPrompt("");
      setPasskey("");
      setSuccess("Upload successful!");
      onUploaded && onUploaded();
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mb-16 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-8"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 rounded-full bg-indigo-500/20 text-indigo-400">
            <Upload size={24} />
          </div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Upload
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* File Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 ml-1">
              Reference Image
            </label>
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`
                relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
                ${file ? "border-green-500/50 bg-green-500/5" : "border-gray-600 hover:border-indigo-400 hover:bg-white/5"}
              `}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />

              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div
                    key="file"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Preview"
                        className="h-48 w-auto rounded-lg shadow-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1 rounded-full text-sm">
                      <Check size={14} />
                      <span className="truncate max-w-[200px]">
                        {file.name}
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3 py-4"
                  >
                    <div className="p-4 rounded-full bg-gray-800/50 text-gray-400">
                      <ImageIcon size={32} />
                    </div>
                    <p className="text-gray-300 font-medium">
                      Click to upload or drag & drop
                    </p>
                    <p className="text-sm text-gray-500">
                      SVG, PNG, JPG or GIF (max. 5MB)
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 ml-1">
              Prompt
            </label>
            <textarea
              placeholder="Describe your imagination... (e.g. 'A futuristic city in neon lights')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all min-h-[120px] resize-none"
            />
          </div>

          {/* Passkey Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 ml-1">
              Access Key
            </label>
            <div className="relative">
              <Key
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                size={18}
              />
              <input
                type="password"
                placeholder="Enter admin passkey"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Status Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
              >
                <X size={16} />
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-green-500/10 border border-green-500/20 text-green-200 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
              >
                <Check size={16} />
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className={`
              w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all
              ${
                loading
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/25"
              }
            `}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={20} />
                Processing...
              </span>
            ) : (
              "Upload"
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
