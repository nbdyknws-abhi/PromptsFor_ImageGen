import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { account } from "../appwrite";
import { uploadPhoto } from "../api/photos";
import { saveGenerationToHistory } from "../api/generationHistory";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Zap,
  Key,
  ExternalLink,
  Clipboard,
  Check,
  Download,
  Loader2,
  HelpCircle,
  Eye,
  EyeOff,
  Upload,
  Image as ImageIcon,
  X,
  AlertTriangle,
} from "lucide-react";

const convertToPngBlob = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas blob conversion failed"));
        }, "image/png");
      };
      img.onerror = () => reject(new Error("Failed to load reference image"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Failed to read reference image file"));
    reader.readAsDataURL(file);
  });
};

export default function Generate() {
  const navigate = useNavigate();
  const { user, toggleSavePhoto, checkUser } = useAuth();

  const autoLoginSite = async () => {
    try {
      let currentUser = null;
      try {
        currentUser = await account.get();
      } catch (e) {
        // No active session
      }

      if (!currentUser) {
        await account.createAnonymousSession();
        if (checkUser) {
          await checkUser();
        }
      }
    } catch (err) {
      console.error("Failed to create anonymous session:", err);
    }
  };

  const handleSocialLogin = (provider) => {
    try {
      const redirectUrl = window.location.origin + "/generate";
      account.createOAuth2Session(provider, redirectUrl, redirectUrl);
    } catch (err) {
      console.error(`OAuth login failed for ${provider}:`, err);
    }
  };

  const formatFetchError = (err, serviceName) => {
    console.error(err);
    if (err.name === "TypeError" || err.message.includes("fetch") || err.message.includes("Load failed") || err.message.includes("NetworkError")) {
      return `Network connection to ${serviceName} failed. Please verify your internet connection or check if the domain is blocked by your network/DNS/VPN/firewall.`;
    }
    return err.message || `An error occurred while calling the ${serviceName} API.`;
  };

  const extractErrorMessage = (text, defaultMessage) => {
    try {
      const data = JSON.parse(text);
      if (data) {
        if (typeof data.error === "string") {
          return data.error;
        }
        if (data.error && typeof data.error === "object") {
          return data.error.message || data.error.detail || JSON.stringify(data.error);
        }
        if (typeof data.message === "string") {
          return data.message;
        }
        if (typeof data.detail === "string") {
          return data.detail;
        }
        return JSON.stringify(data);
      }
    } catch (e) {}
    return defaultMessage;
  };

  const copyTextToClipboard = async (text) => {
    let execCopySuccess = false;
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    if (typeof textArea.setSelectionRange === "function") {
      textArea.setSelectionRange(0, text.length);
    }
    try {
      execCopySuccess = document.execCommand("copy");
    } catch (e) {
      console.warn("execCommand copy failed", e);
    }
    document.body.removeChild(textArea);

    if (execCopySuccess) {
      // Also write via async clipboard in background if available, to ensure it propagates
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      return true;
    }

    // Fallback: try modern async clipboard API
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.error("Async clipboard copy failed", err);
      }
    }

    return false;
  };

  const [prompt, setPrompt] = useState("");
  const [savingToGallery, setSavingToGallery] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("free"); // "free", "premium", "external"
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000000));
  
  // Reference photo state
  const [refFile, setRefFile] = useState(null);
  const refFileInputRef = useRef();

  const handleRefDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      setRefFile(droppedFile);
      setError("");
    } else {
      setError("Only image files allowed as reference.");
    }
  };

  const handleRefFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      setRefFile(selectedFile);
      setError("");
    } else {
      setError("Only image files allowed as reference.");
      setRefFile(null);
    }
  };
  
  // API Key States
  const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem("openai_api_key") || import.meta.env.VITE_OPENAI_API_KEY || "");
  const [showKey, setShowKey] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem("gemini_api_key") || import.meta.env.VITE_GEMINI_API_KEY || "");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGeminiGuide, setShowGeminiGuide] = useState(false);

  const [hfKey, setHfKey] = useState(() => localStorage.getItem("hf_api_key") || import.meta.env.VITE_HF_API_KEY || "");
  const [showHfKey, setShowHfKey] = useState(false);
  const [showHfGuide, setShowHfGuide] = useState(false);

  const [pollinationsKey, setPollinationsKey] = useState(() => localStorage.getItem("pollinations_api_key") || import.meta.env.VITE_POLLINATIONS_API_KEY || "");
  const [showPollinationsKey, setShowPollinationsKey] = useState(false);
  const [showPollinationsGuide, setShowPollinationsGuide] = useState(false);

  const [copiedText, setCopiedText] = useState(false);
  const [redirectSuccess, setRedirectSuccess] = useState("");
  const [redirectModal, setRedirectModal] = useState(null); // null | { target: 'chatgpt' | 'gemini' }

  // Load saved keys
  useEffect(() => {
    const savedOpenAIKey = localStorage.getItem("openai_api_key");
    if (savedOpenAIKey) {
      setOpenaiKey(savedOpenAIKey);
    } else if (import.meta.env.VITE_OPENAI_API_KEY) {
      setOpenaiKey(import.meta.env.VITE_OPENAI_API_KEY);
    }

    const savedGeminiKey = localStorage.getItem("gemini_api_key");
    if (savedGeminiKey) {
      setGeminiKey(savedGeminiKey);
    } else if (import.meta.env.VITE_GEMINI_API_KEY) {
      setGeminiKey(import.meta.env.VITE_GEMINI_API_KEY);
    }

    const savedHfKey = localStorage.getItem("hf_api_key");
    if (savedHfKey) {
      setHfKey(savedHfKey);
    } else if (import.meta.env.VITE_HF_API_KEY) {
      setHfKey(import.meta.env.VITE_HF_API_KEY);
    }

    const savedPollinationsKey = localStorage.getItem("pollinations_api_key");
    if (savedPollinationsKey) {
      setPollinationsKey(savedPollinationsKey);
    } else if (import.meta.env.VITE_POLLINATIONS_API_KEY) {
      setPollinationsKey(import.meta.env.VITE_POLLINATIONS_API_KEY);
    }

    // Check URL Hash for Pollinations API Key from OAuth redirect
    const hash = window.location.hash;
    if (hash && hash.includes("api_key=")) {
      const match = hash.match(/api_key=([^&]+)/);
      if (match && match[1]) {
        const key = match[1];
        setPollinationsKey(key);
        localStorage.setItem("pollinations_api_key", key);
        // Clear hash to keep URL clean without full page reload
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        setRedirectSuccess("Logged in! Successfully linked your Pollinations AI account.");
        setTimeout(() => setRedirectSuccess(""), 4000);
        autoLoginSite();
      }
    }
  }, []);

  // Sync keys with Appwrite user preferences when user state is loaded
  useEffect(() => {
    const syncPrefs = async () => {
      if (!user) return;
      try {
        const prefs = await account.getPrefs();
        let updatedPrefs = { ...prefs };
        let needsUpdate = false;
        
        // Sync OpenAI Key
        if (prefs.openai_api_key && !localStorage.getItem("openai_api_key")) {
          setOpenaiKey(prefs.openai_api_key);
          localStorage.setItem("openai_api_key", prefs.openai_api_key);
        } else if (!prefs.openai_api_key && localStorage.getItem("openai_api_key")) {
          updatedPrefs.openai_api_key = localStorage.getItem("openai_api_key");
          needsUpdate = true;
        }

        // Sync Gemini Key
        if (prefs.gemini_api_key && !localStorage.getItem("gemini_api_key")) {
          setGeminiKey(prefs.gemini_api_key);
          localStorage.setItem("gemini_api_key", prefs.gemini_api_key);
        } else if (!prefs.gemini_api_key && localStorage.getItem("gemini_api_key")) {
          updatedPrefs.gemini_api_key = localStorage.getItem("gemini_api_key");
          needsUpdate = true;
        }

        // Sync HF Key
        if (prefs.hf_api_key && !localStorage.getItem("hf_api_key")) {
          setHfKey(prefs.hf_api_key);
          localStorage.setItem("hf_api_key", prefs.hf_api_key);
        } else if (!prefs.hf_api_key && localStorage.getItem("hf_api_key")) {
          updatedPrefs.hf_api_key = localStorage.getItem("hf_api_key");
          needsUpdate = true;
        }

        // Sync Pollinations Key
        if (prefs.pollinations_api_key && !localStorage.getItem("pollinations_api_key")) {
          setPollinationsKey(prefs.pollinations_api_key);
          localStorage.setItem("pollinations_api_key", prefs.pollinations_api_key);
        } else if (!prefs.pollinations_api_key && localStorage.getItem("pollinations_api_key")) {
          updatedPrefs.pollinations_api_key = localStorage.getItem("pollinations_api_key");
          needsUpdate = true;
        }

        if (needsUpdate) {
          await account.updatePrefs(updatedPrefs);
        }
      } catch (err) {
        console.error("Failed to sync user preferences", err);
      }
    };

    syncPrefs();
  }, [user]);

  const handleSaveKey = async (key) => {
    setOpenaiKey(key);
    localStorage.setItem("openai_api_key", key);
    let currentUser = user;
    if (!currentUser) {
      await autoLoginSite();
      try {
        currentUser = await account.get();
      } catch (e) {}
    }
    if (currentUser) {
      try {
        const prefs = await account.getPrefs();
        await account.updatePrefs({ ...prefs, openai_api_key: key });
      } catch (err) {
        console.error("Failed to sync key to Appwrite preferences", err);
      }
    }
  };

  const handleSaveGeminiKey = async (key) => {
    setGeminiKey(key);
    localStorage.setItem("gemini_api_key", key);
    let currentUser = user;
    if (!currentUser) {
      await autoLoginSite();
      try {
        currentUser = await account.get();
      } catch (e) {}
    }
    if (currentUser) {
      try {
        const prefs = await account.getPrefs();
        await account.updatePrefs({ ...prefs, gemini_api_key: key });
      } catch (err) {
        console.error("Failed to sync key to Appwrite preferences", err);
      }
    }
  };

  const handleSaveHfKey = async (key) => {
    setHfKey(key);
    localStorage.setItem("hf_api_key", key);
    let currentUser = user;
    if (!currentUser) {
      await autoLoginSite();
      try {
        currentUser = await account.get();
      } catch (e) {}
    }
    if (currentUser) {
      try {
        const prefs = await account.getPrefs();
        await account.updatePrefs({ ...prefs, hf_api_key: key });
      } catch (err) {
        console.error("Failed to sync key to Appwrite preferences", err);
      }
    }
  };

  const handleSavePollinationsKey = async (key) => {
    setPollinationsKey(key);
    localStorage.setItem("pollinations_api_key", key);
    let currentUser = user;
    if (!currentUser) {
      await autoLoginSite();
      try {
        currentUser = await account.get();
      } catch (e) {}
    }
    if (currentUser) {
      try {
        const prefs = await account.getPrefs();
        await account.updatePrefs({ ...prefs, pollinations_api_key: key });
      } catch (err) {
        console.error("Failed to sync key to Appwrite preferences", err);
      }
    }
  };

  const handleCopyPrompt = async () => {
    if (!prompt) return;
    const success = await copyTextToClipboard(prompt);
    if (success) {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } else {
      setError("Failed to copy prompt to clipboard.");
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError("Please describe the image you want to generate.");
      return;
    }

    setError("");
    setImageUrl("");
    setGenerating(true);

    // Helper: set image URL + save to 7-day history in IndexedDB
    const setGeneratedImage = async (url) => {
      setImageUrl(url);
      const uid = user?.$id || "anon";
      saveGenerationToHistory({ userId: uid, prompt: prompt.trim(), imageUrl: url }).catch(() => {});
    };

    if (!user) {
      await autoLoginSite();
    }

    if (activeTab === "free") {
      const newSeed = Math.floor(Math.random() * 1000000);
      setSeed(newSeed);
      
      if (pollinationsKey.trim()) {
        try {
          const pollinationsUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(
            prompt.trim()
          )}?nologo=true&seed=${newSeed}&width=1024&height=1024&key=${pollinationsKey.trim()}`;
          
          const response = await fetch(pollinationsUrl);
          if (!response.ok) {
            const text = await response.text();
            const parsedError = extractErrorMessage(text, `Failed to generate image from Pollinations AI (Status ${response.status}).`);
            throw new Error(parsedError);
          }

          const contentType = response.headers.get("content-type");
          if (contentType && !contentType.startsWith("image/")) {
            const text = await response.text();
            let parsedError = "Failed to generate image from Pollinations AI (Invalid content returned).";
            if (contentType.includes("application/json")) {
              parsedError = extractErrorMessage(text, parsedError);
            } else if (contentType.includes("text/html")) {
              parsedError = "The network returned an HTML page instead of an image. This usually happens when the API domain is blocked by a firewall, DNS, VPN, or ISP block page.";
            } else if (text.length < 200) {
              parsedError = text;
            }
            throw new Error(parsedError);
          }

          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          await setGeneratedImage(objectUrl);
        } catch (err) {
          setError(formatFetchError(err, "Pollinations AI"));
        } finally {
          setGenerating(false);
        }
      } else if (hfKey.trim()) {
        try {
          const response = await fetch(
            "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${hfKey.trim()}`,
              },
              body: JSON.stringify({ inputs: prompt.trim() }),
            }
          );

          if (!response.ok) {
            const text = await response.text();
            const parsedError = extractErrorMessage(text, `Failed to generate image from Hugging Face (Status ${response.status}).`);
            throw new Error(parsedError);
          }

          const contentType = response.headers.get("content-type");
          if (contentType && !contentType.startsWith("image/")) {
            const text = await response.text();
            let parsedError = "Failed to generate image from Hugging Face (Invalid content returned).";
            if (contentType.includes("application/json")) {
              parsedError = extractErrorMessage(text, parsedError);
            } else if (contentType.includes("text/html")) {
              parsedError = "The network returned an HTML page instead of an image. This usually happens when the API domain is blocked by a firewall, DNS, VPN, or ISP block page.";
            } else if (text.length < 200) {
              parsedError = text;
            }
            throw new Error(parsedError);
          }

          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          await setGeneratedImage(objectUrl);
        } catch (err) {
          setError(formatFetchError(err, "Pollinations AI"));
        } finally {
          setGenerating(false);
        }
      }
    } else if (activeTab === "openai_key") {
      if (!openaiKey.trim()) {
        setError("Please enter your OpenAI API key first.");
        setGenerating(false);
        return;
      }

      try {
        const response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: prompt.trim(),
            n: 1,
            size: "1024x1024",
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error?.message || "Failed to generate image from OpenAI.");
        }

        await setGeneratedImage(data.data[0].url);
      } catch (err) {
        setError(formatFetchError(err, "OpenAI"));
      } finally {
        setGenerating(false);
      }
    } else if (activeTab === "gemini_key") {
      if (!geminiKey.trim()) {
        setError("Please enter your Gemini API key first.");
        setGenerating(false);
        return;
      }

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${geminiKey.trim()}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              instances: [
                {
                  prompt: prompt.trim(),
                },
              ],
              parameters: {
                sampleCount: 1,
                aspectRatio: "1:1",
                outputMimeType: "image/jpeg",
              },
            }),
          }
        );

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error?.message || "Failed to generate image from Gemini.");
        }

        if (!data.predictions || data.predictions.length === 0) {
          throw new Error("No image returned from Gemini API.");
        }

        const prediction = data.predictions[0];
        const dataUrl = `data:${prediction.mimeType || "image/jpeg"};base64,${prediction.bytesBase64Encoded}`;
        await setGeneratedImage(dataUrl);
      } catch (err) {
        setError(formatFetchError(err, "Gemini"));
      } finally {
        setGenerating(false);
      }
    } else if (activeTab === "hf_key") {
      if (!hfKey.trim()) {
        setError("Please enter your Hugging Face Access Token first.");
        setGenerating(false);
        return;
      }

      try {
        const response = await fetch(
          "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${hfKey.trim()}`,
            },
            body: JSON.stringify({ inputs: prompt.trim() }),
          }
        );

        if (!response.ok) {
          const text = await response.text();
          const parsedError = extractErrorMessage(text, `Failed to generate image from Hugging Face (Status ${response.status}).`);
          throw new Error(parsedError);
        }

        const contentType = response.headers.get("content-type");
        if (contentType && !contentType.startsWith("image/")) {
          const text = await response.text();
          let parsedError = "Failed to generate image from Hugging Face (Invalid content returned).";
          if (contentType.includes("application/json")) {
            parsedError = extractErrorMessage(text, parsedError);
          } else if (contentType.includes("text/html")) {
            parsedError = "The network returned an HTML page instead of an image. This usually happens when the API domain is blocked by a firewall, DNS, VPN, or ISP block page.";
          } else if (text.length < 200) {
            parsedError = text;
          }
          throw new Error(parsedError);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        await setGeneratedImage(objectUrl);
      } catch (err) {
        setError(formatFetchError(err, "Hugging Face"));
      } finally {
        setGenerating(false);
      }
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `promptnexus-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Blob download failed, opening in new tab instead", err);
      window.open(imageUrl, "_blank");
    }
  };

  const handleSaveToGallery = async () => {
    if (!imageUrl) return;
    
    let currentUser = user;
    if (!currentUser) {
      await autoLoginSite();
      try {
        currentUser = await account.get();
      } catch (e) {}
    }

    if (!currentUser) {
      setError("Please log in to save images to your gallery.");
      return;
    }

    setSavingToGallery(true);
    setError("");
    setSaveSuccess(false);

    try {
      // 1. Fetch the image blob from the URL (handles object URL or external URL)
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // 2. Create a file object
      const fileName = `art-${Date.now()}.png`;
      const file = new File([blob], fileName, { type: blob.type || "image/png" });

      // 3. Upload to Appwrite storage and DB
      const result = await uploadPhoto(file, prompt, currentUser.$id);
      
      // 4. Link to user's saved list in Preferences
      if (result && result.doc) {
        await toggleSavePhoto(result.doc.$id);
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save image to gallery. Please try again.");
    } finally {
      setSavingToGallery(false);
    }
  };

  const handleExternalRedirect = async (target) => {
    if (!prompt.trim()) {
      setError("Please write a prompt first.");
      return;
    }

    // Copy while this page still has focus (before any redirect/modal shifts focus)
    let copied = false;
    try {
      if (refFile) {
        // Copy both the text prompt AND the image together — the original approach that worked
        const clipboardItem = new ClipboardItem({
          "text/plain": Promise.resolve(
            new Blob([prompt.trim()], { type: "text/plain" })
          ),
          "image/png": convertToPngBlob(refFile),
        });
        await navigator.clipboard.write([clipboardItem]);
        copied = true;
      } else {
        await navigator.clipboard.writeText(prompt.trim());
        copied = true;
      }
    } catch (err) {
      console.warn("ClipboardItem write failed, trying text-only fallback:", err);
      // Fallback: text only
      copied = await copyTextToClipboard(prompt.trim());
    }

    // Show modal — copy has already happened at this point
    setRedirectModal({ target, copied });
  };

  return (
    <div className="py-8 px-4 max-w-6xl mx-auto z-10 relative">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-2">
          AI Image Generator
        </h1>
        <p className="text-gray-400 text-sm max-w-xl mx-auto">
          Generate high-quality artwork directly on-screen or prepare prompts for external assistants.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Controls & Input */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          {/* Tab Selector */}
          <div className="glass-panel p-1.5 rounded-xl flex flex-wrap gap-1.5 w-full">
            <button
              onClick={() => {
                setActiveTab("free");
                setError("");
              }}
              className={`flex-1 py-2.5 rounded-lg text-xs md:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "free"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Zap size={15} />
              Free Gen
            </button>
            <button
              onClick={() => {
                setActiveTab("hf_key");
                setError("");
              }}
              className={`flex-1 py-2.5 rounded-lg text-xs md:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "hf_key"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Sparkles size={15} />
              HF Free Key
            </button>
            <button
              onClick={() => {
                setActiveTab("gemini_key");
                setError("");
              }}
              className={`flex-1 py-2.5 rounded-lg text-xs md:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "gemini_key"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Key size={15} />
              Gemini key
            </button>
            <button
              onClick={() => {
                setActiveTab("openai_key");
                setError("");
              }}
              className={`flex-1 py-2.5 rounded-lg text-xs md:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "openai_key"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Key size={15} />
              OpenAI key
            </button>
            <button
              onClick={() => {
                setActiveTab("external");
                setError("");
              }}
              className={`flex-1 py-2.5 rounded-lg text-xs md:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "external"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <ExternalLink size={15} />
              Redirects
            </button>
          </div>

          {/* Form Card */}
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-6">
            <form onSubmit={handleGenerate} className="flex flex-col gap-5">
              {/* Info Panel for Free Gen tab */}
              <AnimatePresence>
                {activeTab === "free" && (
                  <motion.div
                    key="free-info-panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-b border-white/10 pb-5 space-y-4"
                  >
                    {/* Pollinations Quality Notice */}
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 p-4 rounded-xl text-xs space-y-2">
                      <p className="font-semibold text-white flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-amber-400 fill-amber-400 animate-pulse" />
                        <span>Reference Mode Notice</span>
                      </p>
                      <p className="text-gray-300 leading-relaxed">
                        Pollinations AI is provided for **quick reference and testing only**. The output quality may not be optimal for production artwork.
                      </p>
                      <p className="text-gray-300 leading-relaxed">
                        For superior results, we highly recommend switching to the{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("external");
                            setError("");
                          }}
                          className="text-indigo-300 hover:text-indigo-200 font-semibold underline bg-transparent border-0 p-0 cursor-pointer"
                        >
                          Redirects
                        </button>{" "}
                        tab to use ChatGPT/Gemini, or pasting your own API keys in the{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("gemini_key");
                            setError("");
                          }}
                          className="text-indigo-300 hover:text-indigo-200 font-semibold underline bg-transparent border-0 p-0 cursor-pointer"
                        >
                          Gemini key
                        </button>{" "}
                        or{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("openai_key");
                            setError("");
                          }}
                          className="text-indigo-300 hover:text-indigo-200 font-semibold underline bg-transparent border-0 p-0 cursor-pointer"
                        >
                          OpenAI key
                        </button>{" "}
                        tabs.
                      </p>
                    </div>

                    {pollinationsKey.trim() ? (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2.5">
                        <Zap size={14} className="fill-emerald-400 text-emerald-400 animate-pulse" />
                        <p className="text-gray-300">
                          <strong className="text-white">Unlimited Generation Active:</strong> Verified Pollinations AI account linked. No queue limits.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 p-4 rounded-xl text-xs space-y-2">
                          <p className="font-semibold text-white flex items-center gap-1.5">
                            <Zap size={14} className="text-amber-400 fill-amber-400 animate-pulse" />
                            <span>Keyless Generation (Pollinations AI)</span>
                          </p>
                          <p className="text-gray-300 leading-relaxed">
                            This generator is 100% free and requires no keys. However, it enforces a strict rate limit of <strong>1 concurrent request at a time per IP</strong>.
                          </p>
                          <p className="text-gray-300 leading-relaxed">
                            If you get <strong>402 Queue full</strong> errors, you can bypass the limit completely by logging in to Pollinations AI below (100% free, no credit card required) or switch to the <span className="text-indigo-300 font-semibold">HF Free Key</span> tab.
                          </p>
                        </div>

                        {hfKey.trim() && (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 p-4 rounded-xl text-xs flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                            <p className="text-gray-300 leading-relaxed">
                              <strong className="text-white">Auto-Routing Active:</strong> A Hugging Face key is configured in your environment. Requests will be automatically routed through Hugging Face FLUX model to bypass the Pollinations IP rate-limiting!
                            </p>
                          </div>
                        )}

                        {/* Direct Account Login Button */}
                        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/5 border border-white/10 p-4 rounded-xl">
                          <div className="text-left space-y-1">
                            <p className="text-xs font-semibold text-white">Direct Account Login</p>
                            <p className="text-[10px] text-gray-400">Log in once to get your own free API key automatically.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const redirectUri = window.location.origin + window.location.pathname;
                              window.location.href = `https://enter.pollinations.ai/authorize?redirect_uri=${encodeURIComponent(redirectUri)}&redirect_url=${encodeURIComponent(redirectUri)}`;
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Zap size={13} className="text-amber-300 fill-amber-300" />
                            <span>Login & Get Free Key</span>
                          </button>
                        </div>
                      </>
                    )}

                    {!user && (
                      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl">
                        <div className="text-left space-y-1">
                          <p className="text-xs font-semibold text-amber-300">Save Your Creations & Sync Keys</p>
                          <p className="text-[10px] text-gray-400">Log in to save images to your gallery and sync your API keys across devices.</p>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                          <button
                            type="button"
                            onClick={() => handleSocialLogin("google")}
                            className="flex-1 md:flex-initial px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                            </svg>
                            <span>Google</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSocialLogin("github")}
                            className="flex-1 md:flex-initial px-3 py-1.5 bg-black/40 hover:bg-black/60 text-white border border-white/10 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                            </svg>
                            <span>GitHub</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-gray-300">
                          Optional Pollinations API Key (Stored Locally - 100% Free)
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPollinationsGuide(!showPollinationsGuide)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                        >
                          <HelpCircle size={14} />
                          How to get a free key?
                        </button>
                      </div>

                      {/* How-To Guide */}
                      {showPollinationsGuide && (
                        <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 p-3 rounded-lg text-xs space-y-1">
                          <p className="font-semibold text-white">Step-by-step Setup:</p>
                          <ol className="list-decimal pl-4 space-y-1 text-gray-300">
                            <li>Go to <a href="https://enter.pollinations.ai" target="_blank" rel="noreferrer" className="underline font-bold text-white hover:text-indigo-300 font-semibold">enter.pollinations.ai</a></li>
                            <li>Sign in via Google, GitHub, or Email (instant registration).</li>
                            <li>Create a new API Key and copy it.</li>
                            <li>Paste it here to bypass all queue limits instantly for free!</li>
                          </ol>
                        </div>
                      )}

                      <div className="relative">
                        <input
                          type={showPollinationsKey ? "text" : "password"}
                          placeholder="pk_..."
                          value={pollinationsKey}
                          onChange={(e) => handleSavePollinationsKey(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPollinationsKey(!showPollinationsKey)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                          {showPollinationsKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {import.meta.env.VITE_POLLINATIONS_API_KEY && !localStorage.getItem("pollinations_api_key") && (
                        <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Key loaded automatically from .env configuration
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* API Key Panel for Hugging Face tab */}
              <AnimatePresence>
                {activeTab === "hf_key" && (
                  <motion.div
                    key="hf-key-panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-b border-white/10 pb-5 space-y-4"
                  >
                    {hfKey.trim() ? (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2.5">
                        <Sparkles size={14} className="text-emerald-400 fill-emerald-400/20 animate-pulse" />
                        <p className="text-gray-300">
                          <strong className="text-white">FLUX Model Connected:</strong> Your Hugging Face key is loaded and active.
                        </p>
                      </div>
                    ) : (
                      /* Direct Key Generation Button */
                      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/5 border border-white/10 p-4 rounded-xl">
                        <div className="text-left space-y-1">
                          <p className="text-xs font-semibold text-white">Get Hugging Face Token</p>
                          <p className="text-[10px] text-gray-400">Create a free "Read" token on Hugging Face to use FLUX.</p>
                        </div>
                        <a
                          href="https://huggingface.co/settings/tokens"
                          target="_blank"
                          rel="noreferrer"
                          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
                        >
                          <Key size={13} />
                          <span>Get Free Token</span>
                        </a>
                      </div>
                    )}

                    {!user && (
                      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl">
                        <div className="text-left space-y-1">
                          <p className="text-xs font-semibold text-amber-300">Save Your Creations & Sync Keys</p>
                          <p className="text-[10px] text-gray-400">Log in to save images to your gallery and sync your API keys across devices.</p>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                          <button
                            type="button"
                            onClick={() => handleSocialLogin("google")}
                            className="flex-1 md:flex-initial px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                            </svg>
                            <span>Google</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSocialLogin("github")}
                            className="flex-1 md:flex-initial px-3 py-1.5 bg-black/40 hover:bg-black/60 text-white border border-white/10 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                            </svg>
                            <span>GitHub</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-gray-300">
                          Hugging Face Access Token (Stored Locally - 100% Free)
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowHfGuide(!showHfGuide)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                        >
                          <HelpCircle size={14} />
                          How to get a free token?
                        </button>
                      </div>

                      {/* How-To Guide */}
                      {showHfGuide && (
                        <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 p-3 rounded-lg text-xs space-y-1">
                          <p className="font-semibold text-white">Step-by-step Setup:</p>
                          <ol className="list-decimal pl-4 space-y-1 text-gray-300">
                            <li>Go to <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="underline font-bold text-white hover:text-indigo-300 animate-pulse">Hugging Face Settings</a></li>
                            <li>Click **"New token"** (assign "Read" role).</li>
                            <li>Copy the generated token (starts with `hf_`).</li>
                            <li>Paste your token here to start generating immediately for free!</li>
                          </ol>
                        </div>
                      )}

                      <div className="relative">
                        <input
                          type={showHfKey ? "text" : "password"}
                          placeholder="hf_..."
                          value={hfKey}
                          onChange={(e) => handleSaveHfKey(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowHfKey(!showHfKey)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                          {showHfKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {import.meta.env.VITE_HF_API_KEY && !localStorage.getItem("hf_api_key") && (
                        <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Token loaded automatically from .env configuration
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* API Key Panel for Gemini tab */}
              <AnimatePresence>
                {activeTab === "gemini_key" && (
                  <motion.div
                    key="gemini-key-panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-b border-white/10 pb-5 space-y-4"
                  >
                    {geminiKey.trim() ? (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2.5">
                        <Key size={14} className="text-emerald-400" />
                        <p className="text-gray-300">
                          <strong className="text-white">Gemini Connected:</strong> Imagen 3 generation active.
                        </p>
                      </div>
                    ) : (
                      /* Direct Key Generation Button */
                      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/5 border border-white/10 p-4 rounded-xl">
                        <div className="text-left space-y-1">
                          <p className="text-xs font-semibold text-white">Get Gemini API Key</p>
                          <p className="text-[10px] text-gray-400">Get a free-tier Gemini API key from Google AI Studio.</p>
                        </div>
                        <a
                          href="https://aistudio.google.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
                        >
                          <Key size={13} />
                          <span>Get Free Key</span>
                        </a>
                      </div>
                    )}

                    {!user && (
                      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl">
                        <div className="text-left space-y-1">
                          <p className="text-xs font-semibold text-amber-300">Save Your Creations & Sync Keys</p>
                          <p className="text-[10px] text-gray-400">Log in to save images to your gallery and sync your API keys across devices.</p>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                          <button
                            type="button"
                            onClick={() => handleSocialLogin("google")}
                            className="flex-1 md:flex-initial px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                            </svg>
                            <span>Google</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSocialLogin("github")}
                            className="flex-1 md:flex-initial px-3 py-1.5 bg-black/40 hover:bg-black/60 text-white border border-white/10 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                            </svg>
                            <span>GitHub</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-gray-300">
                          Gemini API Key (Stored Locally - Free Tier Available)
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowGeminiGuide(!showGeminiGuide)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                        >
                          <HelpCircle size={14} />
                          How to get a free key?
                        </button>
                      </div>

                      {/* How-To Guide */}
                      {showGeminiGuide && (
                        <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 p-3 rounded-lg text-xs space-y-1">
                          <p className="font-semibold text-white">Step-by-step Setup:</p>
                          <ol className="list-decimal pl-4 space-y-1 text-gray-300">
                            <li>Go to <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="underline font-bold text-white hover:text-indigo-300">Google AI Studio</a></li>
                            <li>Click **"Get API key"** at the top left.</li>
                            <li>Click **"Create API key"** and select/create a project.</li>
                            <li>Paste your key here. Gemini provides a free tier which includes Imagen 3!</li>
                          </ol>
                        </div>
                      )}

                      <div className="relative">
                        <input
                          type={showGeminiKey ? "text" : "password"}
                          placeholder="AIzaSy..."
                          value={geminiKey}
                          onChange={(e) => handleSaveGeminiKey(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGeminiKey(!showGeminiKey)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                          {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {import.meta.env.VITE_GEMINI_API_KEY && !localStorage.getItem("gemini_api_key") && (
                        <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Key loaded automatically from .env configuration
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* API Key Panel for OpenAI tab */}
              <AnimatePresence>
                {activeTab === "openai_key" && (
                  <motion.div
                    key="openai-key-panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-b border-white/10 pb-5 space-y-4"
                  >
                    {openaiKey.trim() ? (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2.5">
                        <Key size={14} className="text-emerald-400" />
                        <p className="text-gray-300">
                          <strong className="text-white">OpenAI Connected:</strong> DALL-E 3 generation active.
                        </p>
                      </div>
                    ) : (
                      /* Direct Key Generation Button */
                      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/5 border border-white/10 p-4 rounded-xl">
                        <div className="text-left space-y-1">
                          <p className="text-xs font-semibold text-white">Get OpenAI API Key</p>
                          <p className="text-[10px] text-gray-400">Manage your OpenAI keys and credit balance.</p>
                        </div>
                        <a
                          href="https://platform.openai.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
                        >
                          <Key size={13} />
                          <span>Get API Key</span>
                        </a>
                      </div>
                    )}

                    {!user && (
                      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl">
                        <div className="text-left space-y-1">
                          <p className="text-xs font-semibold text-amber-300">Save Your Creations & Sync Keys</p>
                          <p className="text-[10px] text-gray-400">Log in to save images to your gallery and sync your API keys across devices.</p>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                          <button
                            type="button"
                            onClick={() => handleSocialLogin("google")}
                            className="flex-1 md:flex-initial px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                            </svg>
                            <span>Google</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSocialLogin("github")}
                            className="flex-1 md:flex-initial px-3 py-1.5 bg-black/40 hover:bg-black/60 text-white border border-white/10 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                            </svg>
                            <span>GitHub</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-gray-300">
                          OpenAI API Key (Stored Locally)
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowGuide(!showGuide)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                        >
                          <HelpCircle size={14} />
                          How to get a key?
                        </button>
                      </div>

                      {/* How-To Guide */}
                      {showGuide && (
                        <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 p-3 rounded-lg text-xs space-y-1">
                          <p className="font-semibold">Step-by-step Setup:</p>
                          <ol className="list-decimal pl-4 space-y-1">
                            <li>Go to <a href="https://platform.openai.com/" target="_blank" rel="noreferrer" className="underline font-bold text-white hover:text-indigo-300">OpenAI Dashboard</a></li>
                            <li>Navigate to "API Keys" & create a new secret key.</li>
                            <li>Fund your account with at least $5.00 (keys will not work without credits!).</li>
                            <li>Paste the key here to start generating immediately.</li>
                          </ol>
                        </div>
                      )}

                      <div className="relative">
                        <input
                          type={showKey ? "text" : "password"}
                          placeholder="sk-proj-..."
                          value={openaiKey}
                          onChange={(e) => handleSaveKey(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                          {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {import.meta.env.VITE_OPENAI_API_KEY && !localStorage.getItem("openai_api_key") && (
                        <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Key loaded automatically from .env configuration
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reference Image Upload (Optional) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">
                  Reference Photo (Optional)
                </label>
                <div
                  onDrop={handleRefDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => refFileInputRef.current?.click()}
                  className={`
                    relative border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-300
                    ${refFile ? "border-green-500/30 bg-green-500/5" : "border-white/10 hover:border-indigo-500/30 hover:bg-white/5"}
                  `}
                >
                  <input
                    type="file"
                    accept="image/*"
                    ref={refFileInputRef}
                    className="hidden"
                    onChange={handleRefFileChange}
                  />

                  <AnimatePresence mode="wait">
                    {refFile ? (
                      <motion.div
                        key="has-ref"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-between gap-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={URL.createObjectURL(refFile)}
                            alt="Reference"
                            className="h-12 w-12 rounded-lg object-cover border border-white/10"
                          />
                          <div className="text-left">
                            <p className="text-xs font-semibold text-gray-300 truncate max-w-[180px]">
                              {refFile.name}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {(refFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRefFile(null)}
                          className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="no-ref"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-center gap-3 py-1"
                      >
                        <ImageIcon size={20} className="text-gray-500" />
                        <div className="text-xs text-gray-400">
                          <span className="font-semibold text-indigo-400">Click to upload</span> or drag reference photo
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Text Area Prompt */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-medium text-gray-400">Prompt description</label>
                  {prompt && (
                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedText ? (
                        <>
                          <Check size={14} className="text-green-400" />
                          <span className="text-green-400 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Clipboard size={14} />
                          <span>Copy Prompt</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <textarea
                  placeholder="Describe what you want to see... (e.g. 'A close-up shot of a cybernetic tiger, neon blue wires, dramatic cinematic lighting, hyper-detailed')"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all min-h-[140px] resize-none text-sm leading-relaxed"
                />
              </div>

              {/* Actions */}
              <AnimatePresence>
                {activeTab === "external" && (
                  <motion.div
                    key="external-instructions"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 px-4 py-3.5 rounded-xl text-xs space-y-1.5"
                  >
                    <span className="font-semibold text-white flex items-center gap-1.5"><ExternalLink size={12} /> How this works:</span>
                    <ol className="list-decimal pl-4 space-y-1 text-gray-300">
                      <li>Click <strong className="text-white">ChatGPT DALL-E</strong> or <strong className="text-white">Gemini AI</strong> below.</li>
                      <li>A popup will show your <strong className="text-white">prompt</strong> and <strong className="text-white">reference image</strong> (if uploaded).</li>
                      <li><strong className="text-white">Copy the prompt</strong>, save the image, then open the external site to paste and upload.</li>
                    </ol>
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    key="error-alert"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-sm"
                  >
                    {error}
                  </motion.div>
                )}
                {redirectSuccess && (
                  <motion.div
                    key="success-alert"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-green-500/10 border border-green-500/20 text-green-200 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                  >
                    <Check size={16} className="text-green-400" />
                    {redirectSuccess}
                  </motion.div>
                )}
              </AnimatePresence>

              {activeTab !== "external" ? (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={generating}
                  className={`
                    w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer
                    ${
                      generating
                        ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/10 hover:shadow-indigo-500/25"
                    }
                  `}
                >
                  {generating ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Generating image...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Generate Art</span>
                    </>
                  )}
                </motion.button>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => handleExternalRedirect("chatgpt")}
                    className="py-3.5 px-4 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl font-semibold text-white transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ExternalLink size={16} />
                    ChatGPT DALL-E
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => handleExternalRedirect("gemini")}
                    className="py-3.5 px-4 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl font-semibold text-white transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ExternalLink size={16} />
                    Gemini AI
                  </motion.button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Side: Image Output Preview Canvas */}
        <div className="lg:col-span-6">
          <div className="glass-card rounded-2xl p-6 min-h-[460px] flex flex-col justify-center items-center border border-white/10 relative overflow-hidden bg-black/20">
            <AnimatePresence mode="wait">
              {generating && !imageUrl ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4 text-center z-10"
                >
                  <div className="relative flex items-center justify-center">
                    <Loader2 className="animate-spin text-indigo-400" size={48} />
                    <Sparkles className="absolute text-purple-400 animate-pulse" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Painting your prompt...</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-[240px]">
                      {activeTab === "free" && "Running on Pollinations AI server"}
                      {activeTab === "hf_key" && "Calling Hugging Face FLUX model"}
                      {activeTab === "gemini_key" && "Calling Gemini Imagen 3 system"}
                      {activeTab === "openai_key" && "Calling OpenAI DALL-E 3 system"}
                    </p>
                  </div>
                </motion.div>
              ) : imageUrl ? (
                <motion.div
                  key="image"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full h-full flex flex-col gap-4 items-center z-10 relative"
                >
                  {/* Loader Overlay (on top of the image container while loading) */}
                  {generating && (
                    <div key="loader-overlay" className="absolute inset-0 bg-[#18181b]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 text-center z-20 rounded-xl">
                      <Loader2 className="animate-spin text-indigo-400" size={40} />
                      <span className="text-white font-semibold text-sm">Painting your prompt...</span>
                    </div>
                  )}

                  {refFile ? (
                    <div key="grid-container" className="grid grid-cols-2 gap-4 w-full">
                      {/* Left: Original Photo */}
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold text-gray-400 text-center">Your Photo</span>
                        <div className="relative overflow-hidden rounded-xl border border-white/5 max-h-[300px] w-full flex justify-center items-center bg-black/40">
                          <img
                            src={URL.createObjectURL(refFile)}
                            alt="Reference photo"
                            className="max-h-[300px] w-auto object-contain rounded-xl"
                          />
                        </div>
                      </div>
                      
                      {/* Right: Generated Art */}
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold text-gray-400 text-center">Generated Art</span>
                        <div className="relative overflow-hidden rounded-xl border border-white/5 max-h-[300px] w-full flex justify-center items-center bg-black/40">
                          <img
                            src={imageUrl}
                            alt="AI generated art"
                            onLoad={() => setGenerating(false)}
                            onError={() => {
                              console.error("Image failed to load. URL:", imageUrl);
                              setError("Failed to load generated image. The image URL was blocked or the response was invalid. Please check your network connection or try again.");
                              setGenerating(false);
                            }}
                            className="max-h-[300px] w-auto object-contain rounded-xl hover:scale-[1.02] transition-transform duration-500"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key="single-container" className="relative group overflow-hidden rounded-xl shadow-2xl border border-white/10 max-h-[380px] w-full flex justify-center bg-black/40">
                      <img
                        src={imageUrl}
                        alt={prompt}
                        onLoad={() => setGenerating(false)}
                        onError={() => {
                          console.error("Image failed to load. URL:", imageUrl);
                          setError("Failed to load generated image. The image URL was blocked or the response was invalid. Please check your network connection or try again.");
                          setGenerating(false);
                        }}
                        className="max-h-[380px] w-auto object-contain rounded-xl hover:scale-[1.02] transition-transform duration-500"
                      />
                    </div>
                  )}
                  
                  <div key="button-container" className="flex gap-4 w-full">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleDownload}
                      className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Download size={16} />
                      Download Image
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSaveToGallery}
                      disabled={savingToGallery}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      {savingToGallery ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Saving...
                        </>
                      ) : saveSuccess ? (
                        <>
                          <Check size={16} className="text-green-400" />
                          Saved to Gallery!
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          Save to Gallery
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              ) : refFile ? (
                <motion.div
                  key="ref-preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex flex-col gap-4 items-center z-10"
                >
                  <div className="flex flex-col items-center gap-2 w-full">
                    <span className="text-xs font-semibold text-gray-400">Reference Photo Uploaded</span>
                    <div className="relative overflow-hidden rounded-xl border border-white/10 max-h-[320px] w-full flex justify-center items-center bg-black/40">
                      <img
                        src={URL.createObjectURL(refFile)}
                        alt="Reference preview"
                        className="max-h-[320px] w-auto object-contain rounded-xl shadow-xl"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center max-w-[280px]">
                      {activeTab === "external"
                        ? "Click the redirect buttons below to copy the prompt, then drag this photo into ChatGPT/Gemini and paste (Cmd+V)!"
                        : "Describe the style you want to apply in the prompt and click Generate Art!"}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center p-8 flex flex-col items-center gap-3 text-gray-500"
                >
                  <div className="p-4 rounded-full bg-white/5 border border-white/5 text-gray-500">
                    <Sparkles size={36} />
                  </div>
                  <h3 className="font-semibold text-gray-400">Preview Canvas</h3>
                  <p className="text-xs max-w-[280px]">
                    Your beautiful AI generation output will appear here once ready.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ─── Pre-Redirect Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {redirectModal && (
          <motion.div
            key="redirect-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setRedirectModal(null)}
          >
            <motion.div
              key="redirect-modal"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col gap-4 p-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <ExternalLink size={16} className="text-indigo-400" />
                  Open {redirectModal.target === "chatgpt" ? "ChatGPT DALL-E" : "Gemini AI"}
                </h3>
                <button
                  onClick={() => setRedirectModal(null)}
                  className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Copy status banner */}
              {redirectModal.copied ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-2.5 text-sm">
                  <Check size={16} className="text-emerald-400 flex-shrink-0" />
                  <span className="text-emerald-200 font-medium">
                    {refFile ? "Prompt & image copied to clipboard!" : "Prompt copied to clipboard!"}
                  </span>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-200 space-y-2">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-amber-400" />
                    Auto-copy wasn't available — copy manually below
                  </p>
                  <div className="flex items-center gap-2">
                    <textarea
                      readOnly
                      value={prompt.trim()}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.target.select()}
                      rows={3}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-gray-200 text-xs resize-none focus:outline-none"
                    />
                    <button
                      onClick={async () => {
                        const success = await copyTextToClipboard(prompt.trim());
                        if (success) {
                          setRedirectModal((m) => ({ ...m, copied: true }));
                        }
                      }}
                      className="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <Clipboard size={14} />
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {/* Reference image row */}
              {refFile && (
                <div className="flex gap-3 items-center bg-black/30 border border-white/10 rounded-xl p-3">
                  <img
                    src={URL.createObjectURL(refFile)}
                    alt="Reference"
                    className="w-14 h-14 object-cover rounded-lg border border-white/10 flex-shrink-0"
                  />
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <p className="text-xs text-gray-300 font-medium">Reference image</p>
                    <p className="text-[10px] text-gray-500">
                      {redirectModal.copied
                        ? "Image was copied with the prompt. Just paste (Ctrl+V) directly in the chat!"
                        : "Save this and upload it manually in the chat."}
                    </p>
                    <a
                      href={URL.createObjectURL(refFile)}
                      download={refFile.name || "reference-image.png"}
                      className="text-[10px] flex items-center gap-1 px-2.5 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-semibold transition-colors cursor-pointer w-fit"
                    >
                      <Download size={10} />
                      Save image (backup)
                    </a>
                  </div>
                </div>
              )}

              {/* Open site CTA */}
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href={
                  redirectModal.target === "chatgpt"
                    ? "https://chatgpt.com/"
                    : "https://gemini.google.com/"
                }
                target="_blank"
                rel="noreferrer"
                onClick={() => setRedirectModal(null)}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 flex items-center justify-center gap-2 transition-all text-sm cursor-pointer"
              >
                <ExternalLink size={16} />
                Open {redirectModal.target === "chatgpt" ? "ChatGPT DALL-E" : "Gemini AI"} →
              </motion.a>
              <p className="text-[10px] text-gray-500 text-center -mt-2">
                {refFile && redirectModal.copied
                  ? "Press Ctrl+V / Cmd+V in the chat — your prompt and image are both on the clipboard."
                  : refFile
                  ? "Upload the reference image and paste your prompt in the chat."
                  : "Press Ctrl+V / Cmd+V in the chat to paste your prompt, then hit Enter."}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
