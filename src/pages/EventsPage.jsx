import { useEffect, useState } from "react";

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [user, setUser] = useState({});
  const [rsos, setRsos] = useState([]);
  const [universityName, setUniversityName] = useState("");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);

      fetch(`http://localhost:5000/api/events?userId=${storedUser.id}`)
        .then((res) => res.json())
        .then((data) => setEvents(data));

      fetch(`http://localhost:5000/api/user-rsos/${storedUser.id}`)
        .then((res) => res.json())
        .then((data) => setRsos(data))
        .catch((err) => console.error("Failed to fetch RSOs", err));

      fetch(`http://localhost:5000/api/user-university/${storedUser.id}`)
        .then((res) => res.json())
        .then((data) => setUniversityName(data.name))
        .catch((err) => console.error("Failed to fetch university name", err));
    }
  }, []);

  const handleLogout = () => {
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (confirmed) {
      localStorage.removeItem("user"); // Clear session
      alert("👋 You have been logged out.");
      window.location.href = "/";
    }
  };

  return (
    <div className="p-6 pt-20 bg-gray-100 min-h-screen relative">
      <div className="absolute top-4 left-4 flex flex-wrap items-center gap-4">
        {/* Name */}
        <div className="bg-white px-3 py-1 rounded shadow text-sm font-medium">
          Name: <span className="font-semibold">{user.name}</span>
        </div>

        {/* Role */}
        <div className="bg-white px-3 py-1 rounded shadow text-sm font-medium">
          Role: <span className="capitalize">{user.role}</span>
        </div>

        {/* University */}
        <div className="bg-white px-3 py-1 rounded shadow text-sm font-medium">
          University:{" "}
          <span className="text-blue-700 font-semibold">
            {universityName || "Unknown"}
          </span>
        </div>

        {/* RSOs */}
        <div className="bg-white px-3 py-1 rounded shadow text-sm font-medium">
          RSOs:{" "}
          {rsos.length > 0 ? (
            <span className="ml-1 text-blue-800">
              {rsos.map((rso, index) => (
                <span key={rso.id}>
                  {rso.name}
                  {index < rsos.length - 1 ? ", " : ""}
                </span>
              ))}
            </span>
          ) : (
            <span className="ml-1 italic text-gray-500">None</span>
          )}
        </div>
      </div>

      {/* Logout button - top right */}
      <div className="absolute top-4 right-4">
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 cursor-pointer"
        >
          Logout
        </button>
      </div>

      <h1 className="text-3xl font-bold mb-4">Events Feed</h1>

      {/* Buttons for student */}
      {user.role === "student" && (
        <div className="flex gap-4 mb-6">
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 cursor-pointer">
            Join Existing RSO
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer">
            Create New RSO
          </button>
        </div>
      )}

      {/* Display events */}
      <div className="grid gap-4">
        {events.map((event) => (
          <div key={event.id} className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold">{event.name}</h2>

            <p className="text-sm text-gray-600 mb-1">
              {event.category} | {event.visibility}
            </p>

            {/* ✅ Show RSO or "Public" */}
            <p className="text-sm mb-1">
              Hosted by:{" "}
              <span className="font-medium text-blue-700">
                {event.rso_name || "Public"}
              </span>
            </p>

            <p className="mb-2">{event.description}</p>

            <p className="text-sm text-gray-500">
              {event.event_date} @ {event.event_time}
            </p>
            <p className="text-sm text-gray-500 italic">
              {event.location_name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
