import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../GoogleAuthProvider";
import logo from "../assets/sadata-logo.png";
import backgroundIllustration from "../assets/illustration.png";
import { LogIn } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const { accessToken, login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (accessToken) {
      navigate("/", { replace: true });
    }
  }, [accessToken, navigate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-50 via-white to-blue-100"
    >
      <div className="flex flex-col-reverse md:flex-row w-full max-w-6xl shadow-xl rounded-2xl overflow-hidden backdrop-blur-xl bg-white/70 border border-gray-200">

        {/* Left Side - Form */}
        <div className="w-full md:w-1/2 p-10 flex flex-col justify-center bg-white/80 backdrop-blur-lg">
          <div className="flex items-center gap-3 mb-8">
            <img
              src={logo}
              alt="SADATA Logo"
              className="w-12 h-12 drop-shadow transition-transform duration-500 hover:scale-110 hover:rotate-6"
            />
            <h1 className="text-3xl font-bold text-gray-800 tracking-wide">SADATA</h1>
          </div>

          <p className="text-gray-600 mb-6 text-sm">
            Selamat datang. Silakan login menggunakan akun Google Anda.
          </p>

          <div className="space-y-4">
            <button
              onClick={login}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 rounded-xl shadow-lg transition-all duration-200"
            >
              <LogIn className="w-5 h-5" />
              SIGN IN with Google
            </button>
          </div>

          <footer className="mt-10 text-center text-xs text-gray-400">
            &copy; <a href="https://sada.co.id" className="text-blue-600 hover:underline">SADA TECHNOLOGY</a> 2019 - 2025
          </footer>
        </div>

        {/* Right Side - Illustration */}
        <div className="w-full md:w-1/2 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
          <img
            src={backgroundIllustration}
            alt="Illustration"
            className="object-contain w-full max-h-[90vh] p-4 transition-all duration-500 ease-in-out"
          />
        </div>
      </div>
    </motion.div>
  );
}
