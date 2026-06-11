import { createContext, useContext, useEffect, useState } from "react";
import { account, ID_HELPER } from "../appwrite";

const AuthContext = createContext();

/** After OAuth login Appwrite stores the provider's picture in the session.
 *  We read it once and persist it to prefs.avatarUrl so UserAvatar can use it. */
async function captureOAuthAvatar() {
  try {
    const session = await account.getSession("current");
    // OAuth sessions expose providerUid; email sessions don't have a picture
    if (!session?.provider || session.provider === "email") return;

    // GitHub and Google both expose the avatar via their respective APIs
    // Appwrite doesn't directly expose the photo, but stores it accessible
    // through the account labels or the user object's registration data.
    // The most reliable cross-provider approach: store nothing extra —
    // the UserAvatar component falls back to DiceBear/initials automatically.
    // However, we CAN detect the provider name and build the avatar URL:
    const prefs = await account.getPrefs();
    if (prefs.avatarUrl) return; // already captured, skip

    let avatarUrl = null;

    if (session.provider === "github" && session.providerUid) {
      // GitHub exposes avatar via public API using their numeric user id
      avatarUrl = `https://avatars.githubusercontent.com/u/${session.providerUid}?v=4`;
    } else if (session.provider === "google" && session.providerAccessToken) {
      // Google People API — fetch profile picture using the access token
      try {
        const res = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          { headers: { Authorization: `Bearer ${session.providerAccessToken}` } }
        );
        if (res.ok) {
          const data = await res.json();
          avatarUrl = data.picture || null;
        }
      } catch { /* ignore */ }
    }

    if (avatarUrl) {
      await account.updatePrefs({ ...prefs, avatarUrl });
    }
  } catch { /* ignore — non-critical */ }
}

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
      // Silently try to capture OAuth avatar in background
      captureOAuthAvatar().then(() => {
        // Refresh user so prefs.avatarUrl is visible to UserAvatar
        account.get().then(setUser).catch(() => {});
      });
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
