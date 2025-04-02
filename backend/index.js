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
    const [[user]] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
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
      SELECT r.id, r.name 
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
    const [[user]] = await db.query("SELECT university_id FROM users WHERE id = ?", [userId]);

    if (!user) return res.status(404).json({ error: "User not found" });

    const [[university]] = await db.query("SELECT name FROM universities WHERE id = ?", [user.university_id]);

    if (!university) return res.status(404).json({ error: "University not found" });

    res.json({ name: university.name });
  } catch (err) {
    console.error("Failed to fetch university:", err);
    res.status(500).json({ error: "Could not fetch university" });
  }
});





app.listen(PORT, () => {
  console.log(`✅ Backend server running at http://localhost:${PORT}`);
});
