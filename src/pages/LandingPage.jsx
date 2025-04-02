import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(true);

  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    password: "",
    university_id: "", // added for dropdown
  });

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [universities, setUniversities] = useState([]);

  const navigate = useNavigate();

  // Fetch list of universities on component mount
  useEffect(() => {
    fetch("http://localhost:5000/api/universities")
      .then((res) => res.json())
      .then((data) => setUniversities(data))
      .catch((err) => console.error("Failed to fetch universities", err));
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      // First: create user
      const res = await fetch("http://localhost:5000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupData),
      });

      if (!res.ok) throw new Error("Signup failed");

      // Then: immediately log in
      const loginRes = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signupData.email,
          password: signupData.password,
        }),
      });

      const userData = await loginRes.json();

      if (!loginRes.ok) throw new Error(userData.error || "Login failed");

      localStorage.setItem("user", JSON.stringify(userData.user));
      alert("✅ Sign-up successful! You're now logged in.");
      navigate("/events");
    } catch (err) {
      console.error(err);
      alert("❌ Signup/Login failed.");
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
        localStorage.setItem("user", JSON.stringify(data.user));
        // Save session
        navigate("/events");
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

              <select
                className="w-full p-2 border rounded"
                value={signupData.university_id}
                onChange={(e) =>
                  setSignupData({
                    ...signupData,
                    university_id: e.target.value,
                  })
                }
                required
              >
                <option value="">Select your university</option>
                {universities.map((uni) => (
                  <option key={uni.id} value={uni.id}>
                    {uni.name}
                  </option>
                ))}
              </select>

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
