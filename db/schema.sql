-- ============================================================
-- IT Help Desk Ticketing System — MySQL Schema
-- Run this once against an empty database:
--   mysql -u root -p helpdesk < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS helpdesk
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE helpdesk;

-- ------------------------------------------------------------
-- Users
-- ------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(190)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('employee', 'agent', 'admin') NOT NULL DEFAULT 'employee',
  department    VARCHAR(120)  NULL,
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Categories (lookup table — kept editable without code changes)
-- ------------------------------------------------------------
CREATE TABLE categories (
  id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB;

INSERT INTO categories (name) VALUES
  ('Hardware'), ('Software'), ('Network'), ('Access Request'), ('Other');

-- ------------------------------------------------------------
-- Tickets
-- ------------------------------------------------------------
CREATE TABLE tickets (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(200)  NOT NULL,
  description  TEXT          NOT NULL,
  internal_notes TEXT        NULL,
  status       ENUM('open', 'in_progress', 'resolved', 'closed')
                             NOT NULL DEFAULT 'open',
  priority     ENUM('low', 'medium', 'high', 'urgent')
                             NOT NULL DEFAULT 'medium',
  category_id  INT UNSIGNED  NULL,
  created_by   INT UNSIGNED  NOT NULL,
  assigned_to  INT UNSIGNED  NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
  resolved_at  DATETIME      NULL,

  CONSTRAINT fk_ticket_category
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_ticket_creator
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ticket_assignee
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_created_by (created_by),
  INDEX idx_assigned_to (assigned_to)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Comments (ticket activity / conversation thread)
-- ------------------------------------------------------------
CREATE TABLE ticket_comments (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_id   INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  comment     TEXT         NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_comment_ticket
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_ticket_id (ticket_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Email Notifications Log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_notifications (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_id       INT UNSIGNED NULL,
  recipient_email VARCHAR(190) NOT NULL,
  recipient_name  VARCHAR(120) NOT NULL,
  subject         VARCHAR(255) NOT NULL,
  type            VARCHAR(50)  NOT NULL,
  status          VARCHAR(30)  NOT NULL DEFAULT 'delivered',
  body_text       TEXT         NULL,
  body_html       TEXT         NULL,
  error_message   TEXT         NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_ticket_id (ticket_id),
  INDEX idx_recipient (recipient_email)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Password Resets
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_resets (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  token       VARCHAR(128) NOT NULL UNIQUE,
  expires_at  DATETIME     NOT NULL,
  used_at     DATETIME     NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_reset_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_token (token),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Seed an initial admin user
-- Password: Admin@123  (bcrypt hash below — CHANGE after first login)
-- Generate your own with: node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"
-- ------------------------------------------------------------
INSERT INTO users (name, email, password_hash, role, department) VALUES
  ('System Admin', 'admin@company.com',
   '$2b$10$CwTycUXWue0Thq9StjUM0uJ8G5x5j8rHl5F0mF6D2h6cxOZ1zH1Cu',
   'admin', 'IT');
