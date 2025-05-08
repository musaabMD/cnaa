"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/libs/supabase/client";
import toast from "react-hot-toast";
import config from "@/config";

// This a login/singup page for Supabase Auth.
// Successfull login redirects to /api/auth/callback where the Code Exchange is processed (see app/api/auth/callback/route.js).
export default function Login() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState("signin"); // 'signin' or 'signup'
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    if (mode === "signin") {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Successfully signed in!");
          window.location.href = config.auth.callbackUrl;
        }
      } catch (error) {
        console.log(error);
        toast.error("An error occurred during sign in");
      } finally {
        setIsLoading(false);
      }
    } else if (mode === "signup") {
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/api/auth/callback",
          },
        });
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Check your email to confirm your account!");
        }
      } catch (error) {
        console.log(error);
        toast.error("An error occurred during sign up");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleResetPassword = async () => {
    let emailToReset = email;
    if (!emailToReset) {
      emailToReset = window.prompt("Enter your email to reset password:");
    }
    if (!emailToReset) return;
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailToReset, {
        redirectTo: window.location.origin + "/api/auth/callback",
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset email sent! Check your inbox.");
      }
    } catch (error) {
      toast.error("An error occurred while sending reset email");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main className="p-8 md:p-24" data-theme={config.colors.theme}>
      <div className="text-center mb-4">
        <Link href="/" className="btn btn-ghost btn-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
              clipRule="evenodd"
            />
          </svg>
          Home
        </Link>
      </div>
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center mb-12">
        {mode === "signin" ? "Sign-in" : "Sign-up"} to {config.appName}{" "}
      </h1>

      <div className="max-w-xl mx-auto">
        <form className="form-control w-full space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="label">
              <span className="label-text">Email</span>
            </label>
            <input
              required
              type="email"
              value={email}
              autoComplete="email"
              placeholder="your.email@example.com"
              className="input input-bordered w-full placeholder:opacity-60"
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Password</span>
            </label>
            <input
              required
              type="password"
              value={password}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="••••••••"
              className="input input-bordered w-full placeholder:opacity-60"
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
            {mode === "signin" && (
              <button
                type="button"
                className="btn btn-link btn-xs mt-1 px-0 text-left"
                style={{ textTransform: "none" }}
                onClick={handleResetPassword}
                disabled={isLoading || resetLoading}
              >
                {resetLoading ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  "Forgot Password?"
                )}
              </button>
            )}
          </div>

          <button
            className="btn btn-primary btn-block mt-4"
            disabled={isLoading}
            type="submit"
          >
            {isLoading && (
              <span className="loading loading-spinner loading-xs"></span>
            )}
            {mode === "signin" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div className="divider text-xs text-base-content/50 font-medium">
          {mode === "signin" ? "Don't have an account?" : "Already have an account?"}
        </div>

        <button
          className="btn btn-outline btn-block"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          disabled={isLoading}
        >
          {isLoading && (
            <span className="loading loading-spinner loading-xs"></span>
          )}
          {mode === "signin" ? "Sign Up" : "Sign In"}
        </button>
      </div>
    </main>
  );
}
