const express = require("express");
const app = express();
const PORT = 5000;

const cors = require("cors");
app.use(cors());

const db = require("./db");

app.use(express.json());

app.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM users");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

app.post("/api/users", async (req, res) => {
  const { name, email, password, university_id } = req.body;

  console.log("➡️ Signup received:", req.body);

  try {
    const [result] = await db.query(
      "INSERT INTO users (name, email, password, role, university_id) VALUES (?, ?, ?, 'student', ?)",
      [name, email, password, university_id]
    );

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error("❌ Signup failed:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = rows[0];

    if (user.password !== password) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    res.json({ message: "Login successful", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/events", async (req, res) => {
  const userId = req.query.userId;

  try {
    const [[user]] = await db.query("SELECT * FROM users WHERE id = ?", [
      userId,
    ]);
    const universityId = user.university_id;

    const [rsoRows] = await db.query(
      "SELECT rso_id FROM rso_members WHERE user_id = ?",
      [userId]
    );
    const rsoIds = rsoRows.map((row) => row.rso_id);

    const [events] = await db.query(
      `
      SELECT e.*, r.name AS rso_name
      FROM events e
      LEFT JOIN rsos r ON e.rso_id = r.id
      WHERE e.visibility = 'public'
        OR (e.visibility = 'private' AND e.university_id = ?)
        OR (e.visibility = 'rso' AND e.rso_id IN (?))
      `,
      [universityId, rsoIds.length ? rsoIds : [0]]
    );

    res.json(events);
  } catch (err) {
    console.error("❌ Failed to fetch events:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/universities", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, name FROM universities");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching universities");
  }
});

app.get("/api/user-rsos/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const [rows] = await db.query(
      `
      SELECT r.id, r.name, r.admin_id
      FROM rsos r
      JOIN rso_members rm ON r.id = rm.rso_id
      WHERE rm.user_id = ?
      `,
      [userId]
    );

    res.json(rows); // Array of RSOs
  } catch (err) {
    console.error("Failed to fetch user RSOs:", err);
    res.status(500).json({ error: "Could not fetch RSOs" });
  }
});

app.get("/api/user-university/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const [[user]] = await db.query(
      "SELECT university_id FROM users WHERE id = ?",
      [userId]
    );

    if (!user) return res.status(404).json({ error: "User not found" });

    const [[university]] = await db.query(
      "SELECT name FROM universities WHERE id = ?",
      [user.university_id]
    );

    if (!university)
      return res.status(404).json({ error: "University not found" });

    res.json({ name: university.name });
  } catch (err) {
    console.error("Failed to fetch university:", err);
    res.status(500).json({ error: "Could not fetch university" });
  }
});

app.get("/api/available-rsos/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const [rsos] = await db.query(
      `SELECT * FROM rsos 
       WHERE id NOT IN (
         SELECT rso_id FROM rso_members WHERE user_id = ?
       ) 
       AND admin_id != ?`,
      [userId, userId]
    );

    res.json(rsos);
  } catch (err) {
    console.error("Error fetching available RSOs:", err);
    res.status(500).json({ error: "Server error fetching RSOs" });
  }
});

app.post("/api/join-rso", async (req, res) => {
  const { userId, rsoId } = req.body;

  try {
    await db.query("INSERT INTO rso_members (user_id, rso_id) VALUES (?, ?)", [
      userId,
      rsoId,
    ]);
    res.json({ message: "Joined RSO successfully" });
  } catch (err) {
    console.error("❌ Failed to join RSO:", err);
    res.status(500).json({ error: "Error joining RSO" });
  }
});

app.post("/api/leave-rso", async (req, res) => {
  const { userId, rsoId } = req.body;

  try {
    await db.query("DELETE FROM rso_members WHERE user_id = ? AND rso_id = ?", [
      userId,
      rsoId,
    ]);
    res.json({ message: "Left RSO successfully" });
  } catch (err) {
    console.error("Failed to leave RSO:", err);
    res.status(500).json({ error: "Error leaving RSO" });
  }
});

app.post("/api/create-rso", async (req, res) => {
  const { name, description, university_id, admin_email, members } = req.body;

  if (
    !name ||
    !description ||
    !university_id ||
    !admin_email ||
    !members ||
    members.length !== 5
  ) {
    return res.status(400).json({ error: "Missing or invalid data." });
  }

  const getDomain = (email) => email.split("@")[1];

  // 1. Check all emails share the same domain
  const domain = getDomain(admin_email);
  if (!members.every((email) => getDomain(email) === domain)) {
    return res
      .status(400)
      .json({ error: "All emails must share the same domain." });
  }

  try {
    // 2. Get admin user ID
    const [[adminUser]] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [admin_email]
    );
    if (!adminUser)
      return res.status(404).json({ error: "Admin user not found." });

    // 3. Check if RSO name already exists (optional)
    const [[existing]] = await db.query("SELECT id FROM rsos WHERE name = ?", [
      name,
    ]);
    if (existing)
      return res
        .status(400)
        .json({ error: "RSO with this name already exists." });

    // 4. Insert into rsos table
    const [rsoResult] = await db.query(
      "INSERT INTO rsos (name, description, university_id, admin_id) VALUES (?, ?, ?, ?)",
      [name, description, university_id, adminUser.id]
    );

    const rsoId = rsoResult.insertId;

    // 🆙 Promote user to admin
    await db.query("UPDATE users SET role = 'admin' WHERE id = ?", [
      adminUser.id,
    ]);

    // 5. Add all members to rso_members
    for (const email of members) {
      const [[user]] = await db.query("SELECT id FROM users WHERE email = ?", [
        email,
      ]);
      if (user) {
        const [[existing]] = await db.query(
          "SELECT * FROM rso_members WHERE user_id = ? AND rso_id = ?",
          [user.id, rsoId]
        );

        if (!existing) {
          await db.query(
            "INSERT INTO rso_members (user_id, rso_id) VALUES (?, ?)",
            [user.id, rsoId]
          );
        }
      }
    }

    res.status(201).json({ message: "RSO created successfully" });
  } catch (err) {
    console.error("❌ Error creating RSO:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/create-event", async (req, res) => {
  const {
    name,
    description,
    visibility,
    event_date,
    event_time,
    location_name,
    latitude,
    longitude,
    contact_email,
    contact_phone,
    rso_id,
    created_by,
    university_id,
  } = req.body;

  // Validate required fields (no more 'category')
  if (
    !name ||
    !visibility ||
    !event_date ||
    !event_time ||
    !location_name ||
    !contact_email ||
    !contact_phone ||
    !created_by
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO events (
      name, description, visibility,
      event_date, event_time, location_name,
      latitude, longitude, contact_email, contact_phone,
      rso_id, created_by, university_id, approved
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || null,
        visibility,
        event_date,
        event_time,
        location_name,
        latitude || null,
        longitude || null,
        contact_email,
        contact_phone,
        rso_id || null,
        created_by,
        university_id || null,
        true,
      ]
    );

    res
      .status(201)
      .json({ message: "Event created", eventId: result.insertId });
  } catch (err) {
    console.error("❌ Failed to insert event:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend server running at http://localhost:${PORT}`);
});
