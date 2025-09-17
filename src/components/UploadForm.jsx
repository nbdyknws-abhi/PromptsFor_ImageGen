import { useState, useRef } from "react";
import { uploadPhoto } from "../api/photos";

export default function UploadForm({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef();

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
    if (!file || !prompt) {
      setError("Pick an image and enter a prompt");
      return;
    }
    setLoading(true);
    try {
      await uploadPhoto(file, prompt);
      setFile(null);
      setPrompt("");
      setSuccess("Upload successful!");
      onUploaded && onUploaded();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error(err);
      setError("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-center">
          Upload a Photo + Prompt
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer transition hover:border-blue-400 relative"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={URL.createObjectURL(file)}
                  alt="Preview"
                  className="h-32 w-auto rounded shadow"
                />
                <span className="text-sm text-gray-700">{file.name}</span>
                <button
                  type="button"
                  className="text-xs text-red-500 underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <span className="text-gray-400">
                Drag & drop an image here, or click to select
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <textarea
            placeholder="Enter prompt (e.g. 'A cat in space')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="border border-gray-300 rounded-lg p-3 resize-none focus:outline-none focus:border-blue-400 h-auto min-h-[215px] text-black"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Uploading…" : "Upload"}
          </button>
          {error && (
            <div className="text-red-500 text-sm text-center mt-2">{error}</div>
          )}
          {success && (
            <div className="text-green-600 text-sm text-center mt-2">
              {success}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
