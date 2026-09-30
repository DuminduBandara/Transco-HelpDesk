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
  mobile_number VARCHAR(30)   NULL,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('employee', 'agent', 'admin') NOT NULL DEFAULT 'employee',
  department    VARCHAR(120)  NULL,
  is_active            TINYINT(1)    NOT NULL DEFAULT 1,
  must_change_password TINYINT(1)    NOT NULL DEFAULT 0,
  created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Note for existing databases:
-- ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0;

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
-- Tickets (ID is 6 characters: 2 uppercase letters + 4 digits, e.g. TK1001)
-- ------------------------------------------------------------
CREATE TABLE tickets (
  id           VARCHAR(6)    NOT NULL PRIMARY KEY,
  title        VARCHAR(200)  NOT NULL,
  description  TEXT          NOT NULL,
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
  ticket_id   VARCHAR(6)   NOT NULL,
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
-- Seed initial users
-- Default Password for all: Admin@123
-- Verified bcrypt hash: $2a$10$BoD201yFwN20cSyVbZern.jSqdCnaGyMJ/vBfNum5xQmzKUlMDGra
-- Generate custom hashes with: node scripts/hash-password.js "yourpassword"
-- ------------------------------------------------------------
INSERT INTO users (name, email, password_hash, role, department) VALUES
  ('System Admin', 'admin@company.com',
   '$2a$10$BoD201yFwN20cSyVbZern.jSqdCnaGyMJ/vBfNum5xQmzKUlMDGra',
   'admin', 'IT'),
  ('Sarah Agent', 'agent@company.com',
   '$2a$10$BoD201yFwN20cSyVbZern.jSqdCnaGyMJ/vBfNum5xQmzKUlMDGra',
   'agent', 'IT Support'),
  ('John Employee', 'employee@company.com',
   '$2a$10$BoD201yFwN20cSyVbZern.jSqdCnaGyMJ/vBfNum5xQmzKUlMDGra',
   'employee', 'Operations');

-- Create the new roles table
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255),
  color_code VARCHAR(20) DEFAULT 'default',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert core roles so you don't lose admin access
INSERT IGNORE INTO roles (name, description, color_code) VALUES 
('admin', 'Administrator with full system access', 'secondary'),
('agent', 'IT Support Staff for handling tickets', 'info'),
('employee', 'Standard user who can submit tickets', 'default');

-- Modify the users table to allow dynamic roles (if it was previously an ENUM)
-- Also ensuring the department column is a standard VARCHAR if it isn't already
ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'employee';
ALTER TABLE users MODIFY COLUMN department VARCHAR(100) NULL;
