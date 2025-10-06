const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const useMemoryDb = process.env.NODE_ENV === 'test';

let dbPath = ':memory:';
if (!useMemoryDb) {
  const dbDirectory = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dbDirectory)) {
    fs.mkdirSync(dbDirectory, { recursive: true });
  }
  dbPath = path.join(dbDirectory, 'database.sqlite');
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      referral_code TEXT NOT NULL UNIQUE,
      points INTEGER NOT NULL DEFAULT 0,
      referred_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(referred_by) REFERENCES users(id)
    )
  `);
});

const run = (sql, params = []) => (
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  })
);

const get = (sql, params = []) => (
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  })
);

const all = (sql, params = []) => (
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  })
);

module.exports = {
  db,
  run,
  get,
  all,
};
