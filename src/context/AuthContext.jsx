import { createContext, useContext, useEffect, useState } from "react";
import { account, ID_HELPER } from "../appwrite";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const session = await account.get();
      setUser(session);
      const prefs = await account.getPrefs();
      setSaved(prefs.saved || []);
    } catch (error) {
      setUser(null);
      setSaved([]);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      await account.createEmailPasswordSession(email, password);
      const session = await account.get();
      setUser(session);
      const prefs = await account.getPrefs();
      setSaved(prefs.saved || []);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email, password, name) => {
    setLoading(true);
    try {
      await account.create(ID_HELPER.unique(), email, password, name);
      await account.createEmailPasswordSession(email, password);
      const session = await account.get();
      setUser(session);
      const prefs = await account.getPrefs();
      setSaved(prefs.saved || []);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const toggleSavePhoto = async (photoId) => {
    let currentUser = user;
    let currentSaved = saved;
    if (!currentUser) {
      try {
        currentUser = await account.get();
        const prefs = await account.getPrefs();
        currentSaved = prefs.saved || [];
      } catch (e) {
        return { success: false, error: "Must be logged in" };
      }
    }

    const isCurrentlySaved = currentSaved.includes(photoId);
    const newSaved = isCurrentlySaved
      ? currentSaved.filter((id) => id !== photoId)
      : [...currentSaved, photoId];

    setSaved(newSaved);

    try {
      const prefs = await account.getPrefs();
      await account.updatePrefs({ ...prefs, saved: newSaved });
      return { success: true, saved: newSaved };
    } catch (error) {
      setSaved(currentSaved);
      return { success: false, error: error.message };
    }
  };

  const getSavedPhotos = async () => {
    return saved;
  };

  const requestPasswordReset = async (email) => {
    try {
      // The redirect URL should be to our ResetPassword page
      const url = `${window.location.origin}/reset-password`;
      await account.createRecovery(email, url);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const completePasswordReset = async (userId, secret, password) => {
    try {
      await account.updateRecovery(userId, secret, password, password);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession("current");
      setUser(null);
      setSaved([]);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const value = {
    user,
    loading,
    saved,
    login,
    signup,
    logout,
    checkUser,
    toggleSavePhoto,
    getSavedPhotos,
    requestPasswordReset,
    completePasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
