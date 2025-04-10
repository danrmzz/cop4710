import { useEffect, useState } from "react";
import "../App.css";
import MapPicker from "../components/MapPicker";

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [user, setUser] = useState({});
  const [rsos, setRsos] = useState([]);
  const [universityName, setUniversityName] = useState("");

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [availableRsos, setAvailableRsos] = useState([]);

  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [pendingEvents, setPendingEvents] = useState([]);

  const [allUniversityRsos, setAllUniversityRsos] = useState([]);

  const fetchAllRsosAtUniversity = (universityId) => {
    fetch(`http://localhost:5000/api/university-rsos/${universityId}`)
      .then((res) => res.json())
      .then((data) => setAllUniversityRsos(data))
      .catch((err) => console.error("Failed to fetch university RSOs", err));
  };

  const [pendingCount, setPendingCount] = useState(0);

  const [userRatings, setUserRatings] = useState({});
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [activeEventIdForComments, setActiveEventIdForComments] =
    useState(null);
  const [comments, setComments] = useState([]);

  const handleRateEvent = async (eventId, rating) => {
    try {
      await fetch("http://localhost:5000/api/event-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, eventId, rating }),
      });

      setUserRatings((prev) => ({ ...prev, [eventId]: rating }));
    } catch (err) {
      console.error("Rating failed", err);
      alert("❌ Failed to submit rating");
    }
  };

  const fetchRatings = async () => {
    const res = await fetch(
      `http://localhost:5000/api/user-ratings/${user.id}`
    );
    const data = await res.json();
    const formatted = {};
    data.forEach((r) => {
      formatted[r.event_id] = r.rating;
    });
    setUserRatings(formatted);
  };

  useEffect(() => {
    if (user?.id) {
      fetchRatings();
    }
  }, [user.id]);

  const openCommentsModal = async (eventId) => {
    setActiveEventIdForComments(eventId);
    setShowCommentsModal(true);

    const res = await fetch(
      `http://localhost:5000/api/event-comments/${eventId}`
    );
    const data = await res.json();
    setComments(data);
  };

  const fetchPendingEvents = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/unapproved-events");
      const data = await res.json();
      setPendingEvents(data);
      setPendingCount(data.length);
    } catch (err) {
      console.error("Error fetching unapproved events", err);
    }
  };

  useEffect(() => {
    let interval;

    if (user.role === "super_admin") {
      fetchPendingEvents();

      interval = setInterval(() => {
        fetchPendingEvents();
      }, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user.role]);

  const handleApproveEvent = async (eventId) => {
    try {
      await fetch("http://localhost:5000/api/approve-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });

      alert("✅ Event approved!");
      fetchPendingEvents();
      fetchEvents(user.id);
    } catch (err) {
      console.error("Failed to approve event", err);
      alert("❌ Could not approve event");
    }
  };

  const handleDeleteApprovedEvent = async (eventId) => {
    const confirm = window.confirm(
      "🗑️ Are you sure you want to delete this event?"
    );
    if (!confirm) return;

    try {
      await fetch("http://localhost:5000/api/delete-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });

      alert("✅ Event deleted.");
      fetchEvents(user.id);
      fetchPendingEvents();
    } catch (err) {
      console.error("Failed to delete approved event", err);
      alert("❌ Could not delete event");
    }
  };

  const handleDisapproveEvent = async (eventId) => {
    try {
      await fetch("http://localhost:5000/api/delete-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });

      alert("🗑️ Event disapproved and deleted.");
      fetchPendingEvents();
      fetchEvents(user.id);
    } catch (err) {
      console.error("Failed to delete event", err);
      alert("❌ Could not disapprove event");
    }
  };

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    name: "",
    description: "",
    date: "",
    time: "",
    location: "",
    latitude: null,
    longitude: null,
    contact_email: "",
    contact_phone: "",
    visibility: "",
    rso_id: "",
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
      fetchAllRsosAtUniversity(storedUser.university_id);
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

    if (isRSO) {
      const selectedRSO = allUniversityRsos.find(
        (r) => r.id === parseInt(eventForm.rso_id)
      );

      if (!selectedRSO) {
        return alert("❌ You must select a valid RSO.");
      }

      if (selectedRSO.admin_id !== user.id) {
        return alert(
          "❌ You can only create events for RSOs that you are the admin of."
        );
      }
    }

    const approved = eventForm.visibility === "public" ? false : true;

    const payload = {
      name: eventForm.name,
      description: eventForm.description,
      visibility: eventForm.visibility,
      event_date: eventForm.date,
      event_time: convertTo24Hour(eventForm.time),
      location_name: eventForm.location,
      latitude: eventForm.latitude,
      longitude: eventForm.longitude,
      contact_email: eventForm.contact_email,
      contact_phone: eventForm.contact_phone,
      rso_id: isRSO ? parseInt(eventForm.rso_id) : null,
      created_by: user.id,
      university_id: isPrivate || isRSO ? user.university_id : null,
      approved,
    };

    try {
      const res = await fetch("http://localhost:5000/api/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create event");
      }

      alert(
        approved
          ? "🎉 Event created!"
          : "🕒 Event submitted for approval by super admin."
      );

      setShowCreateEventModal(false);
      setEventForm({
        name: "",
        description: "",
        date: "",
        time: "",
        location: "",
        latitude: null,
        longitude: null,
        contact_email: "",
        contact_phone: "",
        visibility: "",
        rso_id: "",
      });
      fetchEvents(user.id);
    } catch (err) {
      console.error(err);
      const message = err.message || "❌ Something went wrong.";
      alert(message);
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
          Role:{" "}
          <span className="capitalize">
            {user.role
              ? user.role
                  .replace("_", " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())
              : ""}
          </span>
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

      <div className="flex gap-4 mb-6 flex-wrap">
        {user.role === "super_admin" && (
          <div className="relative">
            <button
              onClick={() => {
                setShowRequestsModal(true);
                fetchPendingEvents();
              }}
              className="relative bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 cursor-pointer"
            >
              Public Event Requests
              {/* Red notification bubble */}
              {pendingCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Event cards */}
      <div className="grid gap-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-white p-4 rounded shadow border-l-4 border-blue-600 relative"
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

            <p className="text-sm text-indigo-700 font-medium">
              📅{" "}
              {new Date(event.event_date).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              <br />
              🕒{" "}
              {new Date(`1970-01-01T${event.event_time}`).toLocaleTimeString(
                [],
                {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                }
              )}
            </p>

            <p className="text-sm text-gray-700 italic">
              📍 {event.location_name}
            </p>

            {/* Star Rating */}
            <StarRating
              rating={userRatings[event.id] || 0}
              onRate={(star) => handleRateEvent(event.id, star)}
            />

            {/* View Comments */}
            <span
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm cursor-pointer inline-flex items-center gap-1 w-fit"
              onClick={() => openCommentsModal(event.id)}
            >
              <span>💬</span>
              <span className="underline">View Comments</span>
            </span>

            {user.role === "super_admin" && (
              <button
                onClick={() => handleDeleteApprovedEvent(event.id)}
                className="absolute bottom-3 right-3 bg-red-600 text-white text-xs px-3 py-1 rounded hover:bg-red-700 cursor-pointer"
              >
                Delete
              </button>
            )}
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

      {showRequestsModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow w-[30rem] max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              Pending Public Events
            </h2>

            {pendingEvents.length === 0 ? (
              <p className="text-gray-500">
                No unapproved public events found.
              </p>
            ) : (
              <ul className="space-y-4">
                {pendingEvents.map((event) => (
                  <li
                    key={event.id}
                    className="border rounded p-3 flex flex-col gap-1 bg-gray-50"
                  >
                    <p className="font-medium text-lg">{event.name}</p>
                    <p className="text-sm text-gray-600">{event.description}</p>
                    <p className="text-sm">📍 {event.location_name}</p>
                    <p className="text-sm">🏫 {event.university_name}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleApproveEvent(event.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 cursor-pointer"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() => handleDisapproveEvent(event.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 cursor-pointer"
                      >
                        Disapprove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={() => setShowRequestsModal(false)}
              className="mt-4 w-full bg-gray-400 text-white py-2 rounded hover:bg-gray-500 cursor-pointer"
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
                <select
                  className="w-full p-2 border rounded"
                  value={eventForm.rso_id}
                  onChange={(e) =>
                    setEventForm((prev) => ({
                      ...prev,
                      rso_id: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select an RSO</option>
                  {allUniversityRsos.map((rso) => (
                    <option key={rso.id} value={rso.id}>
                      {rso.name}
                    </option>
                  ))}
                </select>
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

              <MapPicker
                setCoords={(coords) =>
                  setEventForm((prev) => ({
                    ...prev,
                    latitude: coords.lat,
                    longitude: coords.lng,
                  }))
                }
              />

              <input
                className="w-full p-2 border rounded"
                placeholder="Location"
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
                className="w-full p-2 border rounded bg-gray-100"
                value={`Lat: ${eventForm.latitude || ""}, Lng: ${
                  eventForm.longitude || ""
                }`}
                readOnly
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

      {showCommentsModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow w-[30rem] max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Comments</h2>

            {comments.length === 0 ? (
              <p className="text-gray-500 italic">No comments yet.</p>
            ) : (
              <ul className="space-y-2 mb-4">
                {comments.map((c) => (
                  <li
                    key={c.id}
                    className="border p-2 rounded text-sm relative"
                  >
                    {c.user_id === user.id && c.editing ? (
                      <>
                        <textarea
                          className="w-full p-1 border rounded mb-1 text-sm"
                          value={c.editedText}
                          onChange={(e) => {
                            const newVal = e.target.value;
                            setComments((prev) =>
                              prev.map((item) =>
                                item.id === c.id
                                  ? { ...item, editedText: newVal }
                                  : item
                              )
                            );
                          }}
                        />
                        <div className="flex gap-2">
                          <button
                            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 text-xs rounded cursor-pointer"
                            onClick={async () => {
                              await fetch(
                                `http://localhost:5000/api/event-comment/${c.id}`,
                                {
                                  method: "PUT",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    userId: user.id,
                                    comment: c.editedText,
                                  }),
                                }
                              );
                              openCommentsModal(activeEventIdForComments);
                            }}
                          >
                            Save
                          </button>
                          <button
                            className="bg-gray-400 hover:bg-gray-500 text-white px-2 py-1 text-xs rounded cursor-pointer"
                            onClick={() => {
                              setComments((prev) =>
                                prev.map((item) =>
                                  item.id === c.id
                                    ? { ...item, editing: false }
                                    : item
                                )
                              );
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-700">{c.comment}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          – {c.user_name || "User"} on{" "}
                          <>
                            {new Date(c.created_at).toLocaleDateString()} at{" "}
                            {new Date(c.created_at).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </>
                        </p>
                        {c.user_id === user.id && (
                          <div className="absolute top-2 right-2 flex gap-2">
                            <button
                              className="text-blue-500 text-xs no-underline cursor-pointer"
                              onClick={() => {
                                setComments((prev) =>
                                  prev.map((item) =>
                                    item.id === c.id
                                      ? {
                                          ...item,
                                          editing: true,
                                          editedText: item.comment,
                                        }
                                      : item
                                  )
                                );
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              className="text-red-500 text-xs no-underline cursor-pointer"
                              onClick={async () => {
                                const confirmed = window.confirm(
                                  "Delete this comment?"
                                );
                                if (!confirmed) return;
                                await fetch(
                                  `http://localhost:5000/api/event-comment/${c.id}`,
                                  {
                                    method: "DELETE",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({ userId: user.id }),
                                  }
                                );
                                openCommentsModal(activeEventIdForComments);
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Add Comment */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target;
                const comment = form.comment.value.trim();
                if (!comment) return;

                await fetch("http://localhost:5000/api/event-comment", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userId: user.id,
                    eventId: activeEventIdForComments,
                    comment,
                  }),
                });

                form.reset();
                openCommentsModal(activeEventIdForComments);
              }}
            >
              <textarea
                name="comment"
                placeholder="Write your comment..."
                className="w-full border rounded p-2 mb-2"
                required
              />
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 cursor-pointer"
              >
                Post Comment
              </button>
            </form>

            <button
              onClick={() => setShowCommentsModal(false)}
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

function StarRating({ rating, onRate }) {
  return (
    <div className="flex gap-1 mt-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`cursor-pointer text-xl ${
            star <= rating ? "text-yellow-400" : "text-gray-400"
          }`}
          onClick={() => onRate(star)}
        >
          ★
        </span>
      ))}
    </div>
  );
}
