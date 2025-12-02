import React, { useState, useEffect } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { app } from "../config/firebase";
import { Mail, Lock, Eye, EyeOff, Wallet, TrendingUp, PiggyBank, ArrowRight } from "lucide-react";

const auth = app ? getAuth(app) : undefined;
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'
});

interface AuthProps {
  onAuth: (user: any) => void;
  compact?: boolean;
}

const Auth: React.FC<AuthProps> = ({ onAuth, compact }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    if (!auth) {
      setError("Firebase app not initialized.");
      setIsLoading(false);
      return;
    }
    try {
      let userCredential;
      if (isRegister) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }
      onAuth(userCredential.user);
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("Email is already in use.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Incorrect email or password.");
      } else if (err.code === "auth/invalid-credential") {
        setError("Invalid credentials. Please check your email and password.");
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check for redirect result on component mount
  useEffect(() => {
    if (!auth) return;
    
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          onAuth(result.user);
        }
      } catch (err: any) {
        console.error('Redirect result error:', err);
        if (err.code !== 'auth/popup-closed-by-user') {
          setError(err.message);
        }
      }
    };
    
    checkRedirectResult();
  }, [onAuth]);

  const handleGoogleLogin = async () => {
    if (!auth) {
      setError("Firebase app not initialized.");
      return;
    }
    setIsLoading(true);
    setError("");
    
    try {
      // Try popup first
      const result = await signInWithPopup(auth, provider);
      onAuth(result.user);
    } catch (err: any) {
      console.error('Google auth error:', err.code, err.message);
      
      // If popup was blocked or closed, try redirect
      if (err.code === 'auth/popup-closed-by-user' || 
          err.code === 'auth/popup-blocked' ||
          err.code === 'auth/cancelled-popup-request') {
        try {
          // Use redirect as fallback
          await signInWithRedirect(auth, provider);
          // The page will redirect, so no need to handle result here
          return;
        } catch (redirectErr: any) {
          setError("Unable to sign in with Google. Please try again.");
        }
      } else if (err.code === 'auth/network-request-failed') {
        setError("Network error. Please check your connection.");
      } else {
        setError(err.message || "Failed to sign in with Google.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Compact mode for header integration
  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-2 py-1 border rounded text-xs w-28"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-2 py-1 border rounded text-xs w-20"
          required
        />
        <button type="submit" className="bg-indigo-600 text-white px-2 py-1 rounded text-xs">
          Login
        </button>
        <button type="button" onClick={handleGoogleLogin} className="bg-red-500 text-white px-2 py-1 rounded text-xs">
          Google
        </button>
        {error && <span className="text-red-500 text-xs ml-2">{error}</span>}
      </form>
    );
  }

  // Full-page professional auth screen
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Budget Tracker</h1>
          </div>
          <p className="text-white/80 text-lg">Take control of your financial future</p>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Track Expenses</h3>
              <p className="text-white/70">Monitor your spending habits with detailed analytics and insights</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm flex-shrink-0">
              <PiggyBank className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Set Savings Goals</h3>
              <p className="text-white/70">Create and track progress towards your financial milestones</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm flex-shrink-0">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Budget Categories</h3>
              <p className="text-white/70">Organize expenses by category with customizable budget limits</p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/60 text-sm">© 2025 Budget Tracker. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Budget Tracker
            </h1>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {isRegister ? "Create Account" : "Welcome Back"}
              </h2>
              <p className="text-gray-500 mt-2">
                {isRegister
                  ? "Start your journey to financial freedom"
                  : "Sign in to continue managing your finances"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    {isRegister ? "Create Account" : "Sign In"}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-400">or continue with</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            {/* Toggle Register/Login */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError("");
                }}
                className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                {isRegister
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Create one"}
              </button>
            </div>
          </div>

          {/* Mobile Footer */}
          <p className="lg:hidden text-center text-gray-400 text-sm mt-8">
            © 2025 Budget Tracker. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
