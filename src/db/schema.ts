/**
 * Esquema do banco local do Watson.
 *
 * Tudo vive dentro do aparelho, em um unico arquivo SQLite. Nenhuma linha
 * desta base sai do celular, exceto os trechos que o proprio usuario aprova
 * explicitamente na tela de revisao antes de uma pergunta ao Watson.
 */

export const DATABASE_NAME = 'watson.db';

/**
 * Cada entrada e aplicada uma unica vez, em ordem. Para evoluir o banco,
 * acrescente uma nova entrada no fim da lista; nunca edite uma ja publicada.
 */
export const MIGRATIONS: { id: number; name: string; sql: string }[] = [
  {
    id: 1,
    name: 'estrutura_inicial',
    sql: `
      CREATE TABLE IF NOT EXISTS app_user (
        id              INTEGER PRIMARY KEY CHECK (id = 1),
        name            TEXT    NOT NULL,
        email           TEXT,
        password_hash   TEXT    NOT NULL,
        password_salt   TEXT    NOT NULL,
        biometric_ready INTEGER NOT NULL DEFAULT 0,
        created_at      TEXT    NOT NULL,
        updated_at      TEXT    NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        id               TEXT    PRIMARY KEY,
        title            TEXT    NOT NULL,
        description      TEXT,
        category         TEXT    NOT NULL DEFAULT 'reuniao',
        company          TEXT,
        location         TEXT,
        starts_at        TEXT    NOT NULL,
        ends_at          TEXT,
        all_day          INTEGER NOT NULL DEFAULT 0,
        recurrence       TEXT    NOT NULL DEFAULT 'unico',
        recurrence_until TEXT,
        reminders        TEXT    NOT NULL DEFAULT '[]',
        stress_rating    INTEGER,
        created_at       TEXT    NOT NULL,
        updated_at       TEXT    NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events (starts_at);

      CREATE TABLE IF NOT EXISTS birthdays (
        id           TEXT NOT NULL PRIMARY KEY,
        person_name  TEXT NOT NULL,
        birth_month  INTEGER NOT NULL,
        birth_day    INTEGER NOT NULL,
        birth_year   INTEGER,
        relationship TEXT,
        notes        TEXT,
        reminders    TEXT NOT NULL DEFAULT '[]',
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_birthdays_date ON birthdays (birth_month, birth_day);

      CREATE TABLE IF NOT EXISTS health_days (
        date              TEXT PRIMARY KEY,
        recovery          REAL,
        hrv               REAL,
        rhr               REAL,
        sleep_hours       REAL,
        sleep_need_hours  REAL,
        sleep_performance REAL,
        strain            REAL,
        calories          REAL,
        respiratory_rate  REAL,
        spo2              REAL,
        skin_temp         REAL,
        notes             TEXT,
        source            TEXT NOT NULL DEFAULT 'manual',
        raw_text          TEXT,
        created_at        TEXT NOT NULL,
        updated_at        TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS health_activities (
        id           TEXT NOT NULL PRIMARY KEY,
        date         TEXT NOT NULL,
        name         TEXT NOT NULL,
        strain       REAL,
        duration_min REAL,
        avg_hr       REAL,
        max_hr       REAL,
        calories     REAL,
        created_at   TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_activities_date ON health_activities (date);

      CREATE TABLE IF NOT EXISTS meeting_notes (
        id            TEXT NOT NULL PRIMARY KEY,
        title         TEXT NOT NULL,
        company       TEXT NOT NULL DEFAULT 'grupo',
        meeting_date  TEXT NOT NULL,
        participants  TEXT NOT NULL DEFAULT '[]',
        topics        TEXT NOT NULL DEFAULT '[]',
        summary       TEXT NOT NULL,
        decisions     TEXT,
        action_items  TEXT,
        raw_text      TEXT,
        source        TEXT NOT NULL DEFAULT 'plaud',
        event_id      TEXT,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_notes_date ON meeting_notes (meeting_date);
      CREATE INDEX IF NOT EXISTS idx_notes_company ON meeting_notes (company);

      CREATE TABLE IF NOT EXISTS chat_messages (
        id          TEXT NOT NULL PRIMARY KEY,
        role        TEXT NOT NULL,
        content     TEXT NOT NULL,
        context_ref TEXT,
        created_at  TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_messages (created_at);

      CREATE TABLE IF NOT EXISTS insights (
        id           TEXT NOT NULL PRIMARY KEY,
        kind         TEXT NOT NULL,
        severity     TEXT NOT NULL,
        title        TEXT NOT NULL,
        body         TEXT NOT NULL,
        related_date TEXT,
        dismissed    INTEGER NOT NULL DEFAULT 0,
        created_at   TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scheduled_notifications (
        id            TEXT NOT NULL PRIMARY KEY,
        owner_type    TEXT NOT NULL,
        owner_id      TEXT NOT NULL,
        fires_at      TEXT NOT NULL,
        created_at    TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_notif_owner ON scheduled_notifications (owner_type, owner_id);
    `,
  },
  {
    id: 2,
    name: 'busca_textual',
    sql: `
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_search USING fts5(
        note_id UNINDEXED,
        title,
        summary,
        decisions,
        action_items,
        participants,
        topics,
        tokenize = 'unicode61 remove_diacritics 2'
      );
    `,
  },
];
