import { useState } from "react";

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(true); // default to login

  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupData),
      });
      const data = await res.json();
      alert("✅ Sign-up successful!");
      console.log(data);
    } catch (err) {
      console.error(err);
      alert("Sign-up failed.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });
      const data = await res.json();

      if (res.ok) {
        alert("✅ Logged in!");
        console.log(data);
      } else {
        alert(`❌ ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Login failed.");
    }
  };

  return (
    <div className="bg-gray-200 min-h-screen flex items-center justify-center">
      <div className="max-w-md mx-auto">
        <h1 className="text-4xl font-extrabold text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent pb-8 mb-5">
          College Events
        </h1>

        <div className="bg-white p-6 rounded-lg shadow-md">
          {showLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Login</h2>
              <input
                className="w-full p-2 border rounded"
                type="email"
                placeholder="Email"
                value={loginData.email}
                onChange={(e) =>
                  setLoginData({ ...loginData, email: e.target.value })
                }
                required
              />
              <input
                className="w-full p-2 border rounded"
                type="password"
                placeholder="Password"
                value={loginData.password}
                onChange={(e) =>
                  setLoginData({ ...loginData, password: e.target.value })
                }
                required
              />
              <button className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 cursor-pointer">
                Login
              </button>
              <p className="text-sm text-center mt-4">
                Don’t have an account?{" "}
                <span
                  onClick={() => setShowLogin(false)}
                  className="text-blue-600 cursor-pointer underline"
                >
                  Create one
                </span>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Sign Up</h2>
              <input
                className="w-full p-2 border rounded"
                type="text"
                placeholder="Name"
                value={signupData.name}
                onChange={(e) =>
                  setSignupData({ ...signupData, name: e.target.value })
                }
                required
              />
              <input
                className="w-full p-2 border rounded"
                type="email"
                placeholder="Email"
                value={signupData.email}
                onChange={(e) =>
                  setSignupData({ ...signupData, email: e.target.value })
                }
                required
              />
              <input
                className="w-full p-2 border rounded"
                type="password"
                placeholder="Password"
                value={signupData.password}
                onChange={(e) =>
                  setSignupData({ ...signupData, password: e.target.value })
                }
                required
              />
              <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 cursor-pointer">
                Sign Up
              </button>
              <p className="text-sm text-center mt-4">
                Already have an account?{" "}
                <span
                  onClick={() => setShowLogin(true)}
                  className="text-green-600 cursor-pointer underline"
                >
                  Log in
                </span>
              </p>
            </form>
          )}
        </div>
      </div>
      </div>
  );
}
