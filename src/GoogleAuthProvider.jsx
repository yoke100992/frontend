// src/GoogleAuthProvider.jsx
import React, { createContext, useEffect, useState } from "react";
import { gapi } from "gapi-script";

export const AuthContext = createContext();

const CLIENT_ID = "407851505342-0vceq0agtg4fu253jv5a5to23lsbe2f4.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive";

export const GoogleAuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(localStorage.getItem("accessToken") || "");
  const [tokenClient, setTokenClient] = useState(null);

  useEffect(() => {
    const initializeGapi = () => {
      gapi.load("client", async () => {
        await gapi.client.init({});
      });

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse?.access_token) {
            setAccessToken(tokenResponse.access_token);
            localStorage.setItem("accessToken", tokenResponse.access_token);
          }
        },
      });

      setTokenClient(client);

      // ✅ Cek token lama jika ada
      const testToken = localStorage.getItem("accessToken");
      if (testToken) {
        fetch("https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + testToken)
          .then(res => {
            if (!res.ok) throw new Error("Token invalid");
            return res.json();
          })
          .then(() => {
            setAccessToken(testToken);
          })
          .catch(() => {
            setAccessToken("");
            localStorage.removeItem("accessToken");
          });
      }
    };

    initializeGapi();
  }, []);

  // 🔐 Login hanya saat tombol diklik
  const login = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    }
  };

  // 🚪 Logout manual
  const logout = () => {
    setAccessToken("");
    localStorage.removeItem("accessToken");
  };

  return (
    <AuthContext.Provider value={{ accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
