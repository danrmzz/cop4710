import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(true);

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [universities, setUniversities] = useState([]);
  const [superMode, setSuperMode] = useState(false);

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    password: "",
    university_id: "",
    university_name: "",
    description: "",
    location: "",
    student_count: "",
    pictures: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/api/universities")
      .then((res) => res.json())
      .then((data) => setUniversities(data))
      .catch((err) => console.error("Failed to fetch universities", err));
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        name: signupData.name,
        email: signupData.email,
        password: signupData.password,
      };

      if (superMode) {
        const res = await fetch("http://localhost:5000/api/superadmin-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: signupData.name,
            email: signupData.email,
            password: signupData.password,
            university_name: signupData.university_name,
            description: signupData.university_description,
            location: signupData.university_location,
            student_count: signupData.university_student_count,
            pictures: signupData.university_pictures,
          }),
        });

        if (!res.ok) throw new Error("Superadmin signup failed");
      } else {
        payload.university_id = signupData.university_id;
        const res = await fetch("http://localhost:5000/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Student signup failed");
      }

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
      {/* Rainbow Super Admin Toggle */}
      <div
        onClick={() => setSuperMode(!superMode)}
        className="fixed top-4 right-4 w-6 h-6 rounded-full cursor-pointer shadow-md"
        style={{
          background: "linear-gradient(135deg, #aec6ff, #d6b3ff)",
        }}
        title="Toggle Super Admin Mode"
      />

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
              <h2 className="text-xl font-semibold mb-4">
                {superMode ? "Sign Up (Super Admin)" : "Sign Up"}
              </h2>

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

              {superMode ? (
                <>
                  <input
                    className="w-full p-2 border rounded"
                    type="text"
                    placeholder="University Name"
                    value={signupData.university_name}
                    onChange={(e) =>
                      setSignupData({
                        ...signupData,
                        university_name: e.target.value,
                      })
                    }
                    required
                  />

                  <input
                    className="w-full p-2 border rounded"
                    type="text"
                    placeholder="University Location"
                    value={signupData.university_location}
                    onChange={(e) =>
                      setSignupData({
                        ...signupData,
                        university_location: e.target.value,
                      })
                    }
                    required
                  />

                  <textarea
                    className="w-full p-2 border rounded"
                    placeholder="University Description"
                    value={signupData.university_description}
                    onChange={(e) =>
                      setSignupData({
                        ...signupData,
                        university_description: e.target.value,
                      })
                    }
                    required
                  />

                  <input
                    className="w-full p-2 border rounded"
                    type="number"
                    placeholder="Student Count"
                    value={signupData.university_student_count}
                    onChange={(e) =>
                      setSignupData({
                        ...signupData,
                        university_student_count: e.target.value,
                      })
                    }
                    required
                  />

                  <input
                    className="w-full p-2 border rounded"
                    type="text"
                    placeholder="Image URL(s), comma separated"
                    value={signupData.university_pictures}
                    onChange={(e) =>
                      setSignupData({
                        ...signupData,
                        university_pictures: e.target.value,
                      })
                    }
                  />
                </>
              ) : (
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
              )}

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
