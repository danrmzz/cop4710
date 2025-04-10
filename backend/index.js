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
      WHERE e.approved = 1 AND (
        e.visibility = 'public'
        OR (e.visibility = 'private' AND e.university_id = ?)
        OR (e.visibility = 'rso' AND e.rso_id IN (?))
      )
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
    // Check if already a member (optional but good practice)
    const [[existing]] = await db.query(
      "SELECT * FROM rso_members WHERE user_id = ? AND rso_id = ?",
      [userId, rsoId]
    );

    if (existing) {
      return res
        .status(400)
        .json({ error: "User already a member of this RSO" });
    }

    // Insert the new member
    await db.query("INSERT INTO rso_members (user_id, rso_id) VALUES (?, ?)", [
      userId,
      rsoId,
    ]);

    res.json({ message: "🎉 Joined RSO successfully" });
  } catch (err) {
    console.error("❌ Failed to join RSO:", err);
    res.status(500).json({ error: "Error joining RSO" });
  }
});

app.post("/api/leave-rso", async (req, res) => {
  const { userId, rsoId } = req.body;

  try {
    // Check if the user is the admin of the RSO
    const [[rso]] = await db.query("SELECT * FROM rsos WHERE id = ?", [rsoId]);

    if (!rso) return res.status(404).json({ error: "RSO not found" });

    if (rso.admin_id === userId) {
      // Delete all events for this RSO
      await db.query("DELETE FROM events WHERE rso_id = ?", [rsoId]);

      // Remove all members from rso_members
      await db.query("DELETE FROM rso_members WHERE rso_id = ?", [rsoId]);

      // Delete the RSO itself
      await db.query("DELETE FROM rsos WHERE id = ?", [rsoId]);

      // Demote the user back to student
      await db.query("UPDATE users SET role = 'student' WHERE id = ?", [
        userId,
      ]);

      return res.json({ message: "RSO disbanded and user demoted" });
    }

    // Regular member leaving
    await db.query("DELETE FROM rso_members WHERE user_id = ? AND rso_id = ?", [
      userId,
      rsoId,
    ]);

    res.json({ message: "Left RSO successfully" });
  } catch (err) {
    console.error("Failed to leave/disband RSO:", err);
    res.status(500).json({ error: "Error processing request" });
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

    // 4. Insert into rsos table (default to 5 members and active)
    const [rsoResult] = await db.query(
      "INSERT INTO rsos (name, description, university_id, admin_id, members, is_active) VALUES (?, ?, ?, ?, 5, 1)",
      [name, description, university_id, adminUser.id]
    );

    const rsoId = rsoResult.insertId;

    //  Promote user to admin
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
  } = req.body;

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
    //  Fetch university_id from the user's account
    const [[user]] = await db.query(
      "SELECT university_id FROM users WHERE id = ?",
      [created_by]
    );

    if (!user || !user.university_id) {
      return res
        .status(400)
        .json({ error: "Could not determine user's university" });
    }

    const university_id = user.university_id;
    const approved = visibility === "public" ? false : true;

    const [result] = await db.query(
      `INSERT INTO events (
        name, description, visibility,
        event_date, event_time, location_name,
        latitude, longitude, contact_email, contact_phone,
        rso_id, created_by, university_id, approved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        university_id,
        approved,
      ]
    );

    res.status(201).json({
      message: "Event created successfully",
      eventId: result.insertId,
    });
  } catch (err) {
    console.error("❌ Failed to create event:", err);

    // Check for MySQL SIGNAL (trigger) errors
    if (err.code === "ER_SIGNAL_EXCEPTION" || err.errno === 1644) {
      return res.status(400).json({ error: err.sqlMessage });
    }

    res.status(500).json({ error: "Server error creating event" });
  }
});

app.post("/api/disband-rso", async (req, res) => {
  const { userId, rsoId } = req.body;

  try {
    // Verify admin
    const [[rso]] = await db.query(
      "SELECT * FROM rsos WHERE id = ? AND admin_id = ?",
      [rsoId, userId]
    );
    if (!rso) {
      return res
        .status(403)
        .json({ error: "Not authorized to disband this RSO." });
    }

    // Remove all members
    await db.query("DELETE FROM rso_members WHERE rso_id = ?", [rsoId]);

    // Remove all events tied to this RSO
    await db.query("DELETE FROM events WHERE rso_id = ?", [rsoId]);

    // Delete the RSO
    await db.query("DELETE FROM rsos WHERE id = ?", [rsoId]);

    // Demote user
    await db.query("UPDATE users SET role = 'student' WHERE id = ?", [userId]);

    res.json({ message: "✅ RSO disbanded and user demoted." });
  } catch (err) {
    console.error("❌ Failed to disband RSO:", err);
    res.status(500).json({ error: "Server error disbanding RSO" });
  }
});

app.post("/api/superadmin-signup", async (req, res) => {
  const {
    name,
    email,
    password,
    university_name,
    description,
    location,
    student_count,
    pictures,
  } = req.body;

  if (!name || !email || !password || !university_name) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 1. Create the super admin user
    const [userResult] = await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'super_admin')",
      [name, email, password]
    );

    const userId = userResult.insertId;

    // 2. Create the university
    const [uniResult] = await db.query(
      `INSERT INTO universities (name, description, location, student_count, pictures, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        university_name,
        description || null,
        location || null,
        student_count || null,
        pictures || null,
        userId,
      ]
    );

    const universityId = uniResult.insertId;

    // 3. Update the user’s university_id
    await db.query("UPDATE users SET university_id = ? WHERE id = ?", [
      universityId,
      userId,
    ]);

    res.status(201).json({
      message: "Super admin and university created",
      userId,
      universityId,
    });
  } catch (err) {
    console.error("❌ Super Admin signup failed:", err);
    res.status(500).json({ error: "Server error during signup" });
  }
});

app.get("/api/unapproved-events", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.*, u.name as university_name
      FROM events e
      LEFT JOIN universities u ON e.university_id = u.id
      WHERE e.visibility = 'public' AND e.approved = false
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ Failed to fetch unapproved events:", err);
    res.status(500).json({ error: "Error fetching unapproved events" });
  }
});

app.post("/api/approve-event", async (req, res) => {
  const { eventId } = req.body;
  try {
    await db.query("UPDATE events SET approved = true WHERE id = ?", [eventId]);
    res.json({ message: "Event approved successfully" });
  } catch (err) {
    console.error("❌ Failed to approve event:", err);
    res.status(500).json({ error: "Failed to approve event" });
  }
});

app.post("/api/delete-event", async (req, res) => {
  const { eventId } = req.body;

  if (!eventId) {
    return res.status(400).json({ error: "Missing eventId" });
  }

  try {
    await db.query("DELETE FROM events WHERE id = ?", [eventId]);
    res.json({ message: "Event deleted" });
  } catch (err) {
    console.error("Failed to delete event:", err);
    res.status(500).json({ error: "Server error deleting event" });
  }
});

app.post("/api/event-rating", async (req, res) => {
  const { userId, eventId, rating } = req.body;

  if (!userId || !eventId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Invalid rating data" });
  }

  try {
    await db.query(
      `
      INSERT INTO event_ratings (user_id, event_id, rating)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE rating = VALUES(rating)
    `,
      [userId, eventId, rating]
    );

    res.json({ message: "Rating saved" });
  } catch (err) {
    console.error("❌ Failed to save rating:", err);
    res.status(500).json({ error: "Server error saving rating" });
  }
});

app.get("/api/user-ratings/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const [ratings] = await db.query(
      "SELECT event_id, rating FROM event_ratings WHERE user_id = ?",
      [userId]
    );

    res.json(ratings);
  } catch (err) {
    console.error("❌ Failed to fetch user ratings:", err);
    res.status(500).json({ error: "Error fetching ratings" });
  }
});

app.post("/api/event-comment", async (req, res) => {
  const { userId, eventId, comment } = req.body;

  if (!userId || !eventId || !comment || comment.trim() === "") {
    return res.status(400).json({ error: "Invalid comment data" });
  }

  try {
    await db.query(
      "INSERT INTO event_comments (user_id, event_id, comment) VALUES (?, ?, ?)",
      [userId, eventId, comment]
    );

    res.status(201).json({ message: "Comment added" });
  } catch (err) {
    console.error("❌ Failed to add comment:", err);
    res.status(500).json({ error: "Server error adding comment" });
  }
});

app.get("/api/event-comments/:eventId", async (req, res) => {
  const eventId = req.params.eventId;

  try {
    const [comments] = await db.query(
      `SELECT c.*, u.name AS user_name
       FROM event_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.event_id = ?
       ORDER BY c.created_at DESC`,
      [eventId]
    );

    res.json(comments);
  } catch (err) {
    console.error("❌ Failed to fetch comments:", err);
    res.status(500).json({ error: "Server error fetching comments" });
  }
});

app.put("/api/event-comment/:commentId", async (req, res) => {
  const { commentId } = req.params;
  const { userId, comment } = req.body;

  if (!userId || !comment || comment.trim() === "") {
    return res.status(400).json({ error: "Invalid data for update" });
  }

  try {
    const [result] = await db.query(
      "UPDATE event_comments SET comment = ? WHERE id = ? AND user_id = ?",
      [comment, commentId, userId]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Comment not found or unauthorized" });
    }

    res.json({ message: "Comment updated" });
  } catch (err) {
    console.error("❌ Failed to update comment:", err);
    res.status(500).json({ error: "Error updating comment" });
  }
});

app.delete("/api/event-comment/:commentId", async (req, res) => {
  const { commentId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing user ID" });
  }

  try {
    const [result] = await db.query(
      "DELETE FROM event_comments WHERE id = ? AND user_id = ?",
      [commentId, userId]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Comment not found or unauthorized" });
    }

    res.json({ message: "Comment deleted" });
  } catch (err) {
    console.error("❌ Failed to delete comment:", err);
    res.status(500).json({ error: "Error deleting comment" });
  }
});

app.get("/api/university-rsos/:universityId", async (req, res) => {
  const { universityId } = req.params;
  const [rsos] = await db.query("SELECT * FROM rsos WHERE university_id = ?", [
    universityId,
  ]);
  res.json(rsos);
});

app.listen(PORT, () => {
  console.log(`✅ Backend server running at http://localhost:${PORT}`);
});
