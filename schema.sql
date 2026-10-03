-- ==========================================================
-- Transco HelpDesk Database Schema for cPanel MySQL / phpMyAdmin
-- ==========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `mobile_number` VARCHAR(30) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'employee',
  `department` VARCHAR(100) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tickets Table
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` VARCHAR(20) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `status` ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  `category_id` INT DEFAULT NULL,
  `created_by` INT NOT NULL,
  `assigned_to` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `resolved_at` TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT `fk_tickets_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tickets_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tickets_assignee` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Roles Table
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `description` VARCHAR(255) DEFAULT NULL,
  `color_code` VARCHAR(50) DEFAULT 'default',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Departments Table
CREATE TABLE IF NOT EXISTS `departments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- Initial Seed Data
-- ==========================================================

-- Default Categories
INSERT IGNORE INTO `categories` (`id`, `name`) VALUES
(1, 'Hardware & Devices'),
(2, 'Software & Applications'),
(3, 'Network & Connectivity'),
(4, 'Access & Permissions'),
(5, 'Email & Communication'),
(6, 'Printer & Peripherals'),
(7, 'General IT Inquiries');

-- Default Roles
INSERT IGNORE INTO `roles` (`id`, `name`, `description`, `color_code`) VALUES
(1, 'admin', 'Full platform administrator with unrestricted access', 'error'),
(2, 'agent', 'IT HelpDesk support technician / agent', 'primary'),
(3, 'employee', 'Standard user who can submit and manage their own tickets', 'default');

-- Default Departments
INSERT IGNORE INTO `departments` (`id`, `name`) VALUES
(1, 'IT'),
(2, 'Operations'),
(3, 'Finance'),
(4, 'Human Resources'),
(5, 'Customer Service'),
(6, 'Logistics'),
(7, 'Administration');

-- Default Administrator User
-- Email: admin@transco.lk | Password: AdminPassword@123
INSERT IGNORE INTO `users` (`id`, `name`, `email`, `mobile_number`, `password_hash`, `role`, `department`, `is_active`, `must_change_password`) VALUES
(1, 'System Administrator', 'admin@transco.lk', '+94 77 123 4567', '$2a$10$BoD201yFwN20cSyVbZern.jSqdCnaGyMJ/vBfNum5xQmzKUlMDGra', 'admin', 'IT', 1, 0);
-- Note: The default password hash is for: Admin@123

SET FOREIGN_KEY_CHECKS = 1;
