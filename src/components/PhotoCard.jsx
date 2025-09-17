import { useState } from "react";

export default function PhotoCard({ photo }) {
  const [copied, setCopied] = useState(false);

  const copyPrompt = async () => {
    try {
      // Use a temporary textarea to ensure full prompt is copied
      const textarea = document.createElement("textarea");
      textarea.value = photo.prompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this prompt:", photo.prompt);
    }
  };

  const downloadImage = () => {
    const link = document.createElement("a");
    link.href = photo.url;
    link.download = "photo.jpg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-28 rounded-lg overflow-hidden shadow-card bg-[#232323] border border-gray-900 flex flex-col group hover:scale-105 transition-all duration-200">
      <div className="relative">
        <img
          src={photo.url}
          alt="Generated"
          className="w-7xl h-56 object-cover"
          loading="lazy"
        />
        {/* Always visible actions */}
        <div className="absolute top-1 right-1 flex gap-1 z-10">
          <button
            onClick={copyPrompt}
            className="bg-[#e50914] text-white px-2 py-0.5 text-[10px] rounded shadow hover:bg-[#b0060f] border border-transparent font-bold"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={downloadImage}
            className="bg-gray-900 text-white px-2 py-0.5 text-[10px] rounded shadow hover:bg-gray-700 border border-transparent font-bold"
          >
            See Full
          </button>
        </div>
      </div>
      {/* Prompt always visible below image, but truncated */}
      <div className="bg-[#181818] px-2 py-1 text-center">
        <p
          className="text-white text-xs font-medium overflow-hidden text-ellipsis whitespace-normal break-words"
          style={{ maxHeight: "2.5em" }}
          title={photo.prompt}
        >
          {photo.prompt}
        </p>
      </div>
    </div>
  );
}
