import React from "react";
import { useNavigate } from "react-router-dom";
import UploadForm from "../components/UploadForm";

const Upload = () => {
  const navigate = useNavigate();

  const handleUploaded = () => {
    // Redirect to home after successful upload (and short delay for user to see success message)
    setTimeout(() => {
      navigate("/");
    }, 1500);
  };

  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Share Your Creation
        </h1>
        <p className="text-gray-400">
          Upload your AI art and help others learn prompting.
        </p>
      </div>
      <UploadForm onUploaded={handleUploaded} />
    </div>
  );
};

export default Upload;
