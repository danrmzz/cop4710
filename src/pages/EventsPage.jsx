import { useEffect, useState } from "react";
import '../App.css';


export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [user, setUser] = useState({});
  const [rsos, setRsos] = useState([]);
  const [universityName, setUniversityName] = useState("");

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [availableRsos, setAvailableRsos] = useState([]);

  const [showLeaveModal, setShowLeaveModal] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
      fetchEvents(storedUser.id);
      fetchRsos(storedUser.id);
      fetchUniversity(storedUser.id);
    }
  }, []);

  const fetchEvents = (userId) => {
    fetch(`http://localhost:5000/api/events?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => setEvents(data));
  };

  const fetchRsos = (userId) => {
    fetch(`http://localhost:5000/api/user-rsos/${userId}`)
      .then((res) => res.json())
      .then((data) => setRsos(data))
      .catch((err) => console.error("Failed to fetch RSOs", err));
  };

  const fetchUniversity = (userId) => {
    fetch(`http://localhost:5000/api/user-university/${userId}`)
      .then((res) => res.json())
      .then((data) => setUniversityName(data.name))
      .catch((err) => console.error("Failed to fetch university name", err));
  };

  useEffect(() => {
    if (showJoinModal && user.id) {
      fetch(`http://localhost:5000/api/available-rsos/${user.id}`)
        .then((res) => res.json())
        .then((data) => setAvailableRsos(data))
        .catch((err) => console.error("Failed to fetch available RSOs", err));
    }
  }, [showJoinModal, user.id]);

  const handleJoinRso = async (rsoId) => {
    try {
      await fetch("http://localhost:5000/api/join-rso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, rsoId }),
      });

      alert("🎉 Joined RSO!");
      setShowJoinModal(false);
      fetchRsos(user.id);
      fetchEvents(user.id);
    } catch (err) {
      console.error("Failed to join RSO", err);
      alert("❌ Could not join RSO");
    }
  };

  const handleLeaveRso = async (rsoId) => {
    try {
      await fetch("http://localhost:5000/api/leave-rso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, rsoId }),
      });

      alert("🏃 Left the RSO.");
      setShowLeaveModal(false);
      fetchRsos(user.id);
      fetchEvents(user.id);
    } catch (err) {
      console.error("Failed to leave RSO", err);
      alert("❌ Could not leave RSO");
    }
  };

  const handleLogout = () => {
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (confirmed) {
      localStorage.removeItem("user");
      alert("👋 You have been logged out.");
      window.location.href = "/";
    }
  };

  return (
    <div className="p-6 pt-20 bg-gray-100 min-h-screen relative">
      {/* Top badges */}
      <div className="absolute top-4 left-4 flex flex-wrap items-center gap-4">
        <div className="bg-white px-3 py-1 rounded shadow text-sm font-medium">
          Name: <span className="font-semibold">{user.name}</span>
        </div>
        <div className="bg-white px-3 py-1 rounded shadow text-sm font-medium">
          Role: <span className="capitalize">{user.role}</span>
        </div>
        <div className="bg-white px-3 py-1 rounded shadow text-sm font-medium">
          University:{" "}
          <span className="text-blue-700 font-semibold">
            {universityName || "Unknown"}
          </span>
        </div>
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

      {/* Logout */}
      <div className="absolute top-4 right-4">
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 cursor-pointer"
        >
          Logout
        </button>
      </div>

      <h1 className="text-3xl font-bold mb-4">Events Feed</h1>

      {/* Student-only buttons */}
      {user.role === "student" && (
        <div className="flex gap-4 mb-6 flex-wrap">
          <button
            onClick={() => setShowJoinModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 cursor-pointer"
          >
            Join Existing RSO
          </button>
          <button
            onClick={() => setShowLeaveModal(true)}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 cursor-pointer"
          >
            Leave an RSO
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer">
            Create New RSO
          </button>
        </div>
      )}

      {/* Event cards */}
      <div className="grid gap-4">
        {events.map((event) => (
          <div key={event.id} className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold">{event.name}</h2>
            <p className="text-sm text-gray-600 mb-1">
              {event.category} | {event.visibility}
            </p>
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

      {/* Join RSO Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow w-96">
            <h2 className="text-xl font-semibold mb-4">Join an RSO</h2>
            {availableRsos.length === 0 ? (
              <p className="text-gray-500">No RSOs available to join.</p>
            ) : (
              <ul className="space-y-2">
                {availableRsos.map((rso) => (
                  <li
                    key={rso.id}
                    className="flex justify-between items-center bg-gray-100 px-3 py-2 rounded"
                  >
                    <span>{rso.name}</span>
                    <button
                      onClick={() => handleJoinRso(rso.id)}
                      className="text-sm bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 cursor-pointer"
                    >
                      Join
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => setShowJoinModal(false)}
              className="mt-4 w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Leave RSO Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow w-96">
            <h2 className="text-xl font-semibold mb-4">Leave an RSO</h2>
            {rsos.length === 0 ? (
              <p className="text-gray-500">You're not in any RSOs.</p>
            ) : (
              <ul className="space-y-2">
                {rsos.map((rso) => (
                  <li
                    key={rso.id}
                    className="flex justify-between items-center bg-gray-100 px-3 py-2 rounded"
                  >
                    <span>{rso.name}</span>
                    <button
                      onClick={() => handleLeaveRso(rso.id)}
                      className="text-sm bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 cursor-pointer"
                    >
                      Leave
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => setShowLeaveModal(false)}
              className="mt-4 w-full bg-gray-400 text-white py-2 rounded hover:bg-gray-500 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
