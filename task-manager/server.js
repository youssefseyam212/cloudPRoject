const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const app = express();
app.use(express.json());

// MySQL connection pool
const pool = mysql.createPool({
  host: 'project-r-db.cv6og2gy4aa1.eu-north-1.rds.amazonaws.com',
  user: 'admin',
  password: 'Messi2020$',
  database: 'projectDB',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// JWKS client setup for Cognito
const client = jwksClient({
  jwksUri: 'https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_DPCOuYG5a/.well-known/jwks.json',
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Authorization header missing' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, getKey, {
    issuer: 'https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_DPCOuYG5a',
    algorithms: ['RS256'],
  }, (err, decoded) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = {
      id: decoded.sub, // Cognito's unique user identifier
      email: decoded.email,
    };
    next();
  });
};

// Register or upsert user from Cognito
app.post('/users', authenticateToken, async (req, res) => {
  try {
    const { id, email } = req.user;

    const [existingUser] = await pool.execute('SELECT * FROM users WHERE user_id = ?', [id]);
    if (existingUser.length === 0) {
      await pool.execute('INSERT INTO users (user_id, email) VALUES (?, ?)', [id, email]);
    }

    res.json({ success: true, message: 'User exists or created successfully' });
  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({ error: 'User registration failed' });
  }
});

// GET all tasks for authenticated user
app.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const [tasks] = await pool.execute(
      'SELECT * FROM tasks WHERE user_id = ?',
      [req.user.id]
    );
    res.json(tasks);
  } catch (error) {
    console.error('Fetch tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET single task by ID (if owned)
app.get('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const [task] = await pool.execute('SELECT * FROM tasks WHERE task_id = ?', [req.params.id]);
    if (!task.length) return res.status(404).json({ error: 'Task not found' });

    if (task[0].user_id !== req.user.id)
      return res.status(403).json({ error: 'Unauthorized to view this task' });

    res.json(task[0]);
  } catch (error) {
    console.error('Fetch task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// CREATE task
app.post('/tasks', authenticateToken, async (req, res) => {
  const { title, description, status, due_date, assigned_to } = req.body;
  try {
    await pool.execute(
      'INSERT INTO tasks (user_id, title, description, status, due_date, assigned_to) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description, status, due_date, assigned_to]
    );
    res.status(201).json({ success: true, message: 'Task created' });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// UPDATE task
app.put('/tasks/:id', authenticateToken, async (req, res) => {
  const { title, description, status, due_date, assigned_to } = req.body;
  try {
    const [task] = await pool.execute('SELECT * FROM tasks WHERE task_id = ?', [req.params.id]);
    if (!task.length) return res.status(404).json({ error: 'Task not found' });

    if (task[0].user_id !== req.user.id)
      return res.status(403).json({ error: 'Unauthorized to update this task' });

    await pool.execute(
      'UPDATE tasks SET title = ?, description = ?, status = ?, due_date = ?, assigned_to = ? WHERE task_id = ?',
      [title, description, status, due_date, assigned_to, req.params.id]
    );

    res.json({ success: true, message: 'Task updated' });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE task
app.delete('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const [task] = await pool.execute('SELECT * FROM tasks WHERE task_id = ?', [req.params.id]);
    if (!task.length) return res.status(404).json({ error: 'Task not found' });

    if (task[0].user_id !== req.user.id)
      return res.status(403).json({ error: 'Unauthorized to delete this task' });

    await pool.execute('DELETE FROM tasks WHERE task_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running at http://0.0.0.0:${PORT}`);
});
