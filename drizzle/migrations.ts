// Minimal migration runner for Expo SQLite to create all needed tables.
// This is a pragmatic replacement until drizzle-kit codegen is added.

type SQLiteDB = any;

function execStatements(db: SQLiteDB, statements: string[]) {
  return new Promise<void>((resolve, reject) => {
    try {
      // Prefer sync exec if available (openDatabaseSync)
      if (typeof db.execSync === 'function') {
        try {
          // Join into one script; execSync supports multiple statements
          const script = statements.join('\n');
          db.execSync(script);
          return resolve();
        } catch (e) {
          return reject(e);
        }
      }
      // Fallback to classic transaction API
      if (typeof db.transaction === 'function') {
        db.transaction((tx: any) => {
          try {
            for (const stmt of statements) {
              const s = stmt.trim();
              if (!s) continue;
              tx.executeSql(s);
            }
            resolve();
          } catch (e) {
            reject(e);
          }
        });
        return;
      }
      // If neither API exists, resolve (nothing we can do)
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

export async function applyMigrations(db: SQLiteDB) {
  const stmts: string[] = [
    'PRAGMA journal_mode = WAL;',
    // conversations_local
    `CREATE TABLE IF NOT EXISTS conversations_local (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT,
      created_by TEXT NOT NULL,
      avatar_url TEXT,
      last_message_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      muted INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0
    );`,
    // conversation_members_local
    `CREATE TABLE IF NOT EXISTS conversation_members_local (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      joined_at INTEGER NOT NULL
    );`,
    // messages_local
    `CREATE TABLE IF NOT EXISTS messages_local (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      text TEXT,
      type TEXT NOT NULL,
      reply_to_message_id TEXT,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      edited_at INTEGER,
      deleted_at INTEGER,
      attachments_count INTEGER DEFAULT 0,
      reactions_count INTEGER DEFAULT 0
    );`,
    // attachments_local
    `CREATE TABLE IF NOT EXISTS attachments_local (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      uri TEXT NOT NULL,
      storage_id TEXT,
      mime_type TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      size_bytes INTEGER,
      upload_status TEXT NOT NULL
    );`,
    // reactions_local
    `CREATE TABLE IF NOT EXISTS reactions_local (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );`,
    // read_receipts_local
    `CREATE TABLE IF NOT EXISTS read_receipts_local (
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      read_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, conversation_id)
    );`,
    // sync_state
    `CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      last_cursor TEXT,
      last_synced_at INTEGER
    );`,
    // outbox
    `CREATE TABLE IF NOT EXISTS outbox (
      client_id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      attempt_count INTEGER DEFAULT 0,
      last_attempt_at INTEGER,
      error TEXT
    );`,
  ];

  try {
    await execStatements(db, stmts);
    // Conditionally add columns if missing (SQLite lacks IF NOT EXISTS for ADD COLUMN)
    await new Promise<void>((resolve) => {
      if (typeof db.transaction !== 'function') return resolve();
      db.transaction((tx: any) => {
        const ensureColumn = (table: string, column: string, ddl: string, next: () => void) => {
          tx.executeSql(
            `PRAGMA table_info(${table});`,
            [],
            (_: any, res: any) => {
              const exists = res?.rows?._array?.some?.((r: any) => r.name === column);
              if (exists) return next();
              tx.executeSql(ddl, [], () => next(), () => next());
            },
            () => next()
          );
        };
        // Chain ensures to run sequentially in single transaction
        ensureColumn(
          'messages_local',
          'attachments_count',
          'ALTER TABLE messages_local ADD COLUMN attachments_count INTEGER DEFAULT 0;',
          () =>
            ensureColumn(
              'messages_local',
              'reactions_count',
              'ALTER TABLE messages_local ADD COLUMN reactions_count INTEGER DEFAULT 0;',
              () => resolve()
            )
        );
      });
    });
  } catch (e) {
    console.warn('Migrations apply failed:', e);
  }
}


