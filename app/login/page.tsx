"use client";

// import { useRouter } from 'next/navigation';
import { useState } from "react";
import Cookies from "js-cookie";
import { BsEye, BsEyeSlash } from "react-icons/bs"; // 👁 icons

export default function LoginPage() {
  // const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("*&$@!asvab3372008");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const formData = new URLSearchParams();
    formData.append("action", "admin-login");
    formData.append("username", username);
    formData.append("password", password);

    try {
      const response = await fetch(process.env.NEXT_PUBLIC_PHP_API_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      const result = await response.json();

      if (result.status === 200 && result.isSuccess) {
        // Set cookie
        Cookies.set("admin-auth", "true", { expires: 1 });
        // Reload to update Navbar immediately
        window.location.href = "/admin";
      } else {
        setError("Invalid username or password. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the server.");
    }
  };

  return (
    <section className="login-container py-5">
      <div
        className="card login-card p-4 shadow mx-auto"
        style={{ maxWidth: "400px" }}
      >
        <h4 className="text-center mb-4">Login to Your Account</h4>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div className="mb-3">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              id="username"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>

          {/* Password with toggle */}
          <div className="mb-3 position-relative">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              className="form-control pe-5"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "10px",
                top: "70%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                fontSize: "1.2rem",
                color: "#666",
              }}
            >
              {showPassword ? <BsEyeSlash /> : <BsEye />}
            </span>
          </div>

          {/* Submit */}
          <div className="d-grid">
            <button
              type="submit"
              className="btn btn-primary-custom w-50 mx-auto"
            >
              Login
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
