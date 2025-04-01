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
  const userId = req.query.userId; // we'll pass this in
  const user = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
  const universityId = user[0].university_id;

  // Get RSO memberships for this user
  const [rsoRows] = await db.query(
    "SELECT rso_id FROM rso_members WHERE user_id = ?",
    [userId]
  );
  const rsoIds = rsoRows.map((row) => row.rso_id);

  const [events] = await db.query(
    `
    SELECT * FROM events
    WHERE visibility = 'public'
      OR (visibility = 'private' AND university_id = ?)
      OR (visibility = 'rso' AND rso_id IN (?))
  `,
    [universityId, rsoIds.length ? rsoIds : [0]]
  ); // [0] prevents SQL error if empty

  res.json(events);
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


app.listen(PORT, () => {
  console.log(`✅ Backend server running at http://localhost:${PORT}`);
});
