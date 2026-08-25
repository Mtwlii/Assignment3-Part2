const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");

const app = express();
const USERS_FILE = path.join(__dirname, "users.json");

app.use(express.json());

async function readUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, "utf-8");

    if (!data.trim()) {
      return [];
    }

    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      await fs.writeFile(USERS_FILE, "[]");
      return [];
    }
    throw err;
  }
}

async function writeUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// 1) CREATE — POST /user
app.post("/user", async (req, res) => {
  try {
    const newUser = req.body;
    const users = await readUsers();

    const emailExists = users.some((user) => user.email === newUser.email);

    if (emailExists) {
      return res.status(400).json({ message: "Email already exists." });
    }

    const validIds = users
      .map((user) => user.id)
      .filter((id) => typeof id === "number");
    const newId = validIds.length > 0 ? Math.max(...validIds) + 1 : 1;
    newUser.id = newId;

    users.push(newUser);
    await writeUsers(users);

    res.status(201).json({ message: "User added successfully." });
  } catch (err) {
    res.status(400).json({ message: "Invalid JSON input." });
  }
});

// 2) UPDATE — PATCH /user/:id
app.patch("/user/:id", async (req, res) => {
  const userId = Number(req.params.id);
  const updates = req.body;

  try {
    const users = await readUsers();
    const userIndex = users.findIndex((user) => user.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ message: "User ID not found." });
    }

    const allowedFields = ["name", "age", "email"];
    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        users[userIndex][field] = updates[field];
      }
    });

    await writeUsers(users);

    const updatedField = allowedFields.find(
      (field) => updates[field] !== undefined,
    );
    res
      .status(200)
      .json({ message: `User ${updatedField} updated successfully.` });
  } catch (err) {
    res.status(400).json({ message: "Invalid JSON input." });
  }
});

// 3) DELETE — DELETE /user/:id  (id can also come from the request body)
async function deleteUserHandler(req, res) {
  const userId = Number(req.params.id ?? req.body.id);
  const users = await readUsers();

  const userIndex = users.findIndex((user) => user.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ message: "User ID not found." });
  }

  users.splice(userIndex, 1);
  await writeUsers(users);

  res.status(200).json({ message: "User deleted successfully." });
}

app.delete("/user/:id", deleteUserHandler);
app.delete("/user", deleteUserHandler);

// 4) GET BY NAME — GET /user/getByName?name=...
app.get("/user/getByName", async (req, res) => {
  const { name } = req.query;
  const users = await readUsers();

  const user = users.find((u) => u.name === name);

  if (!user) {
    return res.status(404).json({ message: "User name not found." });
  }

  res.status(200).json(user);
});

// 5) READ ALL — GET /user
app.get("/user", async (req, res) => {
  const users = await readUsers();
  res.status(200).json(users);
});

// 6) FILTER BY MIN AGE — GET /user/filter?minAge=...
app.get("/user/filter", async (req, res) => {
  const minAge = Number(req.query.minAge);
  const users = await readUsers();

  const filtered = users.filter((u) => u.age >= minAge);

  if (filtered.length === 0) {
    return res.status(404).json({ message: "no user found" });
  }

  res.status(200).json(filtered);
});

// 7) READ ONE — GET /user/:id
app.get("/user/:id", async (req, res) => {
  const userId = Number(req.params.id);
  const users = await readUsers();

  const user = users.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  res.status(200).json(user);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
