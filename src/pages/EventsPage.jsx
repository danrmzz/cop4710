import { useEffect, useState } from "react";
import "../App.css";

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [user, setUser] = useState({});
  const [rsos, setRsos] = useState([]);
  const [universityName, setUniversityName] = useState("");

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [availableRsos, setAvailableRsos] = useState([]);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    name: "",
    description: "",
    date: "",
    time: "",
    location: "",
    contact_email: "",
    contact_phone: "",
    visibility: "", // NEW
  });

  const [rsoForm, setRsoForm] = useState({
    name: "",
    description: "",
    members: ["", "", "", ""],
  });

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i % 12 === 0 ? 12 : i % 12;
    const period = i < 12 ? "AM" : "PM";
    return `${hour}:00 ${period}`;
  });

  const getEmailDomain = (email) => email.split("@")[1] || "";

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
    const rso = rsos.find((r) => r.id === rsoId);

    // Only show confirmation if the user is the admin (disbanding)
    if (rso && rso.admin_id === user.id) {
      const confirm = window.confirm(
        "⚠️ You are the admin of this RSO. Disbanding will:\n\n• Delete this RSO\n• Remove all its members\n• Delete all events\n\nAre you sure?"
      );
      if (!confirm) return;
    }

    try {
      await fetch("http://localhost:5000/api/leave-rso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, rsoId }),
      });

      if (rso && rso.admin_id === user.id) {
        alert("☠️ RSO disbanded. You are now a student.");
        localStorage.setItem(
          "user",
          JSON.stringify({ ...user, role: "student" })
        );
        setUser((prev) => ({ ...prev, role: "student" }));
      } else {
        alert("🏃 Successfully left the RSO.");
      }

      setShowLeaveModal(false);
      fetchRsos(user.id);
      fetchEvents(user.id);
    } catch (err) {
      console.error("Failed to leave/disband RSO", err);
      alert("❌ Could not complete action");
    }
  };

  const handleCreateRso = async (e) => {
    e.preventDefault();

    const emails = [user.email, ...rsoForm.members];
    const domains = emails.map(getEmailDomain);
    const allSameDomain = domains.every((d) => d === domains[0]);

    if (!allSameDomain) {
      return alert("❌ All emails must share the same domain.");
    }

    try {
      const res = await fetch("http://localhost:5000/api/create-rso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: rsoForm.name,
          description: rsoForm.description,
          university_id: user.university_id,
          admin_email: user.email,
          members: emails,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`❌ ${data.error}`);
      } else {
        alert("🎉 RSO created successfully!");
        localStorage.setItem(
          "user",
          JSON.stringify({ ...user, role: "admin" })
        );
        setUser((prev) => ({ ...prev, role: "admin" }));

        setShowCreateModal(false);
        setRsoForm({ name: "", description: "", members: ["", "", "", ""] });
        fetchRsos(user.id);
        fetchEvents(user.id);
      }
    } catch (err) {
      console.error("Create RSO failed:", err);
      alert("❌ Something went wrong.");
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();

    const isRSO = eventForm.visibility === "rso";
    const isPrivate = eventForm.visibility === "private";

    const rso = rsos.find((r) => r.admin_id === user.id);

    if (isRSO && !rso) {
      return alert("❌ No RSO found for this admin");
    }

    const payload = {
      name: eventForm.name,
      description: eventForm.description,
      visibility: eventForm.visibility,
      event_date: eventForm.date,
      event_time: convertTo24Hour(eventForm.time),
      location_name: eventForm.location,
      latitude: null,
      longitude: null,
      contact_email: eventForm.contact_email,
      contact_phone: eventForm.contact_phone,
      rso_id: isRSO ? rso.id : null,
      created_by: user.id,
      university_id: isPrivate || isRSO ? user.university_id : null,
      approved: true,
    };

    console.log("📦 Payload:", payload);

    try {
      const res = await fetch("http://localhost:5000/api/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create event");

      alert("🎉 Event created!");
      setShowCreateEventModal(false);
      fetchEvents(user.id);
    } catch (err) {
      console.error(err);
      alert("❌ Could not create event");
    }
  };

  const convertTo24Hour = (timeStr) => {
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":");

    if (modifier === "PM" && hours !== "12") {
      hours = parseInt(hours) + 12;
    }
    if (modifier === "AM" && hours === "12") {
      hours = "00";
    }

    return `${hours.toString().padStart(2, "0")}:${minutes}:00`;
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
                  <span className={rso.admin_id === user.id ? "font-bold" : ""}>
                    {rso.name}
                  </span>
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
      {(user.role === "student" || user.role === "admin") && (
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

          {user.role === "student" && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer"
            >
              Create New RSO
            </button>
          )}

          {user.role === "admin" && (
            <button
              onClick={() => setShowCreateEventModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 cursor-pointer"
            >
              Create Event
            </button>
          )}
        </div>
      )}

      {/* Event cards */}
      <div className="grid gap-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-white p-4 rounded shadow border-l-4 border-blue-600"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {event.name}
            </h2>

            <p className="text-sm font-semibold text-blue-700 mb-2">
              {event.visibility === "public"
                ? "🌐 Public Event"
                : event.visibility === "private"
                ? `🏫 Private Event – ${universityName}`
                : `🤝 RSO Event – ${event.rso_name}`}
            </p>

            <p className="text-gray-800 mb-2">{event.description}</p>

            <p className="text-sm text-gray-700">
              📅 {event.event_date} @ 🕒 {event.event_time}
            </p>

            <p className="text-sm text-gray-700 italic">
              📍 {event.location_name}
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
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
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
                      className={`text-sm ${
                        rso.admin_id === user.id ? "bg-red-700" : "bg-red-600"
                      } text-white px-2 py-1 rounded hover:bg-red-800 cursor-pointer`}
                    >
                      {rso.admin_id === user.id ? "Disband" : "Leave"}
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

      {showCreateEventModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow w-[28rem] max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Create Event</h2>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <input
                className="w-full p-2 border rounded"
                placeholder="Event Name"
                value={eventForm.name}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />

              <textarea
                className="w-full p-2 border rounded"
                placeholder="Event Description"
                value={eventForm.description}
                onChange={(e) =>
                  setEventForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                required
              />

              <select
                className="w-full p-2 border rounded"
                value={eventForm.visibility}
                onChange={(e) =>
                  setEventForm((prev) => ({
                    ...prev,
                    visibility: e.target.value,
                  }))
                }
                required
              >
                <option value="">Select Type</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="rso">RSO</option>
              </select>

              {eventForm.visibility === "private" && (
                <input
                  className="w-full p-2 border rounded bg-gray-100"
                  value={universityName}
                  disabled
                />
              )}

              {eventForm.visibility === "rso" && (
                <input
                  className="w-full p-2 border rounded bg-gray-100"
                  value={
                    rsos.find((rso) => rso.admin_id === user.id)?.name ||
                    "No RSO found"
                  }
                  disabled
                />
              )}

              <input
                className="w-full p-2 border rounded"
                type="date"
                value={eventForm.date}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, date: e.target.value }))
                }
                required
              />

              <select
                className="w-full p-2 border rounded"
                value={eventForm.time}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, time: e.target.value }))
                }
                required
              >
                <option value="">Select Time</option>
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i % 12 === 0 ? 12 : i % 12;
                  const ampm = i < 12 ? "AM" : "PM";
                  const formatted = `${hour}:00 ${ampm}`;
                  return (
                    <option key={i} value={formatted}>
                      {formatted}
                    </option>
                  );
                })}
              </select>

              <input
                className="w-full p-2 border rounded"
                placeholder="Location Name"
                value={eventForm.location}
                onChange={(e) =>
                  setEventForm((prev) => ({
                    ...prev,
                    location: e.target.value,
                  }))
                }
                required
              />

              <input
                className="w-full p-2 border rounded"
                placeholder="Contact Phone"
                value={eventForm.contact_phone}
                onChange={(e) =>
                  setEventForm((prev) => ({
                    ...prev,
                    contact_phone: e.target.value,
                  }))
                }
                required
              />

              <input
                className="w-full p-2 border rounded"
                type="email"
                placeholder="Contact Email"
                value={eventForm.contact_email || ""}
                onChange={(e) =>
                  setEventForm((prev) => ({
                    ...prev,
                    contact_email: e.target.value,
                  }))
                }
                required
              />

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 cursor-pointer"
              >
                Create Event
              </button>
            </form>

            <button
              onClick={() => setShowCreateEventModal(false)}
              className="mt-3 w-full bg-gray-400 text-white py-2 rounded hover:bg-gray-500 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Create RSO Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow w-[28rem] max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Create New RSO</h2>

            <form onSubmit={handleCreateRso} className="space-y-3">
              <input
                className="w-full p-2 border rounded"
                placeholder="RSO Name"
                value={rsoForm.name}
                onChange={(e) =>
                  setRsoForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
              <textarea
                className="w-full p-2 border rounded"
                placeholder="RSO Description"
                value={rsoForm.description}
                onChange={(e) =>
                  setRsoForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                required
              />
              <input
                className="w-full p-2 border rounded bg-gray-100"
                value={universityName}
                disabled
              />
              <input
                className="w-full p-2 border rounded bg-gray-100"
                value={user.email}
                disabled
              />
              {rsoForm.members.map((member, idx) => (
                <input
                  key={idx}
                  className="w-full p-2 border rounded"
                  type="email"
                  placeholder={`Member ${idx + 2} Email`}
                  value={member}
                  onChange={(e) => {
                    const updated = [...rsoForm.members];
                    updated[idx] = e.target.value;
                    setRsoForm((prev) => ({ ...prev, members: updated }));
                  }}
                  required
                />
              ))}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 cursor-pointer"
              >
                Create RSO
              </button>
            </form>

            <button
              onClick={() => setShowCreateModal(false)}
              className="mt-3 w-full bg-gray-400 text-white py-2 rounded hover:bg-gray-500 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
