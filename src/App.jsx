import "./App.css";
import { useState } from "react";

function App() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      console.log("✅ User created:", data);
      alert("User created successfully!");
    } catch (err) {
      console.error("❌ Error creating user:", err);
      alert("Failed to create user.");
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create User</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="w-full p-2 border rounded"
          name="name"
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <input
          className="w-full p-2 border rounded"
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          className="w-full p-2 border rounded"
          name="password"
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <button
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          type="submit"
        >
          Submit
        </button>
      </form>
    </div>
  );
}

export default App;
