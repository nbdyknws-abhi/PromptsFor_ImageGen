import { useState } from "react";
import UploadForm from "./components/UploadForm";
import Gallery from "./components/Gallery";
import "./App.css";

function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [notification, setNotification] = useState({ message: "", type: "" });

  const handleUploaded = () => {
    setRefreshKey((prev) => prev + 1);
    setNotification({
      message: "Photo uploaded successfully!",
      type: "success",
    });
  };

  // Notification auto-dismiss
  if (notification.message) {
    setTimeout(() => setNotification({ message: "", type: "" }), 2500);
  }

  return (
    <div className="p-6 min-h-screen bg-[#181818]">
      <h1 className="text-3xl font-bold text-center mb-8 text-white">
        📸 Photo + Prompt Gallery
      </h1>
      {notification.message && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 text-white font-semibold transition ${notification.type === "success" ? "bg-green-500" : "bg-red-500"}`}
        >
          {notification.message}
        </div>
      )}
      <UploadForm onUploaded={handleUploaded} />
      {/* Key forces re-render of Gallery */}
      <Gallery key={refreshKey} />
    </div>
  );
}

export default App;
