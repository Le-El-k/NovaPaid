
-- NovaPaid database structure only; exported from the local XAMPP MariaDB schema.
-- This file contains no user rows and no DROP TABLE statements.
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `novapaid` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `novapaid`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_approvals` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `request_ref` varchar(40) NOT NULL,
  `requested_by` bigint(20) unsigned NOT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `action_type` varchar(80) NOT NULL,
  `target_ref` varchar(80) NOT NULL,
  `reason` varchar(500) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `decided_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_ref` (`request_ref`),
  KEY `fk_approval_requester` (`requested_by`),
  KEY `fk_approval_approver` (`approved_by`),
  KEY `idx_approval_status` (`status`,`created_at`),
  CONSTRAINT `fk_approval_approver` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_approval_requester` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `api_rate_limits` (
  `bucket_hash` char(64) NOT NULL,
  `attempts` smallint(5) unsigned NOT NULL DEFAULT 0,
  `window_started` datetime NOT NULL,
  `blocked_until` datetime DEFAULT NULL,
  PRIMARY KEY (`bucket_hash`),
  KEY `idx_rate_window` (`window_started`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `app_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`setting_value`)),
  `version` int(10) unsigned NOT NULL DEFAULT 1,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`setting_key`),
  KEY `fk_setting_user` (`updated_by`),
  CONSTRAINT `fk_setting_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `actor_id` bigint(20) unsigned DEFAULT NULL,
  `role` varchar(40) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `target` varchar(120) DEFAULT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `request_id` char(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_date` (`created_at`),
  KEY `idx_audit_actor` (`actor_id`,`created_at`),
  CONSTRAINT `fk_audit_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `token_hash` char(64) NOT NULL,
  `purpose` enum('verify_email','recover_account') NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_auth_token_user` (`user_id`,`purpose`),
  CONSTRAINT `fk_token_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `beneficiaries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `label` varchar(100) NOT NULL,
  `recipient_user_id` bigint(20) unsigned DEFAULT NULL,
  `provider` varchar(80) DEFAULT NULL,
  `destination_token` varchar(190) DEFAULT NULL,
  `destination_masked` varchar(80) DEFAULT NULL,
  `status` enum('pending','verified','blocked') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_beneficiary_recipient` (`recipient_user_id`),
  KEY `idx_beneficiary_user` (`user_id`,`status`),
  CONSTRAINT `fk_beneficiary_owner` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_beneficiary_recipient` FOREIGN KEY (`recipient_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `card_orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `public_ref` varchar(40) NOT NULL,
  `idempotency_key` varchar(120) NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `card_type` enum('virtual','physical') NOT NULL DEFAULT 'virtual',
  `price_minor` bigint(20) unsigned NOT NULL DEFAULT 0,
  `currency` char(3) NOT NULL DEFAULT 'XAF',
  `status` enum('pending','submitted','active','failed','cancelled') NOT NULL DEFAULT 'pending',
  `provider` varchar(80) NOT NULL DEFAULT 'sandbox-card-provider',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `public_ref` (`public_ref`),
  UNIQUE KEY `idempotency_key` (`idempotency_key`),
  KEY `idx_card_order_user` (`user_id`,`created_at`),
  CONSTRAINT `fk_card_order_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `card_transactions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `card_id` bigint(20) unsigned NOT NULL,
  `provider_reference` varchar(120) NOT NULL,
  `description` varchar(180) NOT NULL,
  `amount_minor` bigint(20) NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'XAF',
  `status` enum('pending','succeeded','reversed','declined') NOT NULL DEFAULT 'succeeded',
  `occurred_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `provider_reference` (`provider_reference`),
  KEY `idx_card_tx_card` (`card_id`,`occurred_at`),
  CONSTRAINT `fk_card_tx_card` FOREIGN KEY (`card_id`) REFERENCES `cards` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cards` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `card_order_id` bigint(20) unsigned DEFAULT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `provider` varchar(80) NOT NULL DEFAULT 'sandbox-card-provider',
  `provider_card_ref` varchar(120) DEFAULT NULL,
  `label` varchar(80) NOT NULL,
  `masked_pan` varchar(32) NOT NULL DEFAULT '**** **** **** 1234',
  `card_type` enum('virtual','physical') NOT NULL DEFAULT 'virtual',
  `status` enum('requested','pending','active','frozen','compromised','rejected') NOT NULL DEFAULT 'pending',
  `external_balance_minor` bigint(20) unsigned NOT NULL DEFAULT 0,
  `synced_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `card_order_id` (`card_order_id`),
  UNIQUE KEY `provider_card_ref` (`provider_card_ref`),
  KEY `idx_card_user` (`user_id`,`status`),
  CONSTRAINT `fk_card_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `funding_orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `public_ref` varchar(40) NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `provider` varchar(80) NOT NULL,
  `payer_phone` varchar(32) DEFAULT NULL,
  `provider_reference` varchar(120) DEFAULT NULL,
  `idempotency_key` varchar(120) NOT NULL,
  `amount_minor` bigint(20) unsigned NOT NULL,
  `fee_minor` bigint(20) unsigned NOT NULL DEFAULT 0,
  `currency` char(3) NOT NULL DEFAULT 'XAF',
  `status` enum('created','pending','succeeded','failed','reversed','review_required') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `public_ref` (`public_ref`),
  UNIQUE KEY `idempotency_key` (`idempotency_key`),
  UNIQUE KEY `provider_reference` (`provider_reference`),
  KEY `idx_funding_user` (`user_id`,`created_at`),
  KEY `idx_funding_status` (`status`,`created_at`),
  CONSTRAINT `fk_funding_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kyc_cases` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `public_ref` varchar(40) NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `provider` varchar(80) NOT NULL DEFAULT 'manual-sandbox-review',
  `provider_reference` varchar(120) DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `decision_reason` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `public_ref` (`public_ref`),
  KEY `fk_kyc_user` (`user_id`),
  KEY `fk_kyc_reviewer` (`reviewed_by`),
  KEY `idx_kyc_status` (`status`,`created_at`),
  CONSTRAINT `fk_kyc_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_kyc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ledger_entries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `transaction_id` bigint(20) unsigned NOT NULL,
  `wallet_id` bigint(20) unsigned NOT NULL,
  `direction` enum('debit','credit') NOT NULL,
  `amount_minor` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_entry_tx` (`transaction_id`),
  KEY `idx_entry_wallet` (`wallet_id`,`created_at`),
  CONSTRAINT `fk_entry_tx` FOREIGN KEY (`transaction_id`) REFERENCES `ledger_transactions` (`id`),
  CONSTRAINT `fk_entry_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ledger_transactions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `public_ref` varchar(40) NOT NULL,
  `idempotency_key` varchar(120) NOT NULL,
  `type` enum('transfer','deposit','withdrawal','purchase','card_order','adjustment','sandbox_funding','refund') NOT NULL,
  `status` enum('created','pending','succeeded','failed','reversed','review_required') NOT NULL,
  `currency` char(3) NOT NULL,
  `amount_minor` bigint(20) unsigned NOT NULL,
  `fee_minor` bigint(20) unsigned NOT NULL DEFAULT 0,
  `description` varchar(255) NOT NULL,
  `created_by` bigint(20) unsigned NOT NULL,
  `recipient_user_id` bigint(20) unsigned DEFAULT NULL,
  `related_ref` varchar(80) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `public_ref` (`public_ref`),
  UNIQUE KEY `idempotency_key` (`idempotency_key`),
  KEY `fk_tx_recipient` (`recipient_user_id`),
  KEY `idx_tx_user_created` (`created_by`,`created_at`),
  KEY `idx_tx_status` (`status`,`created_at`),
  KEY `idx_tx_related` (`related_ref`),
  CONSTRAINT `fk_tx_recipient` FOREIGN KEY (`recipient_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_tx_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `login_throttles` (
  `throttle_key` char(64) NOT NULL,
  `attempts` smallint(5) unsigned NOT NULL DEFAULT 0,
  `window_started` datetime NOT NULL,
  `locked_until` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`throttle_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mfa_totp_replays` (
  `user_id` bigint(20) unsigned NOT NULL,
  `last_step` bigint(20) unsigned NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_totp_replay_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `channel` enum('in_app','email','sms','push') NOT NULL DEFAULT 'in_app',
  `title` varchar(150) NOT NULL,
  `message` varchar(500) NOT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_notification_user` (`user_id`,`created_at`),
  CONSTRAINT `fk_notification_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `category` enum('games','subscriptions','gift_cards') NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` varchar(255) NOT NULL,
  `provider` varchar(80) NOT NULL DEFAULT 'sandbox-store-provider',
  `price_minor` bigint(20) unsigned NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'XAF',
  `available` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `provider_events` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `provider` varchar(80) NOT NULL,
  `event_id` varchar(190) NOT NULL,
  `event_type` varchar(80) NOT NULL,
  `signature_valid` tinyint(1) NOT NULL DEFAULT 0,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`payload`)),
  `outcome` varchar(80) NOT NULL DEFAULT 'received',
  `received_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `processed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_provider_event` (`provider`,`event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `security_events` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `event_type` varchar(80) NOT NULL,
  `context` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`context`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_security_event_user` (`user_id`,`created_at`),
  CONSTRAINT `fk_security_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `store_orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `public_ref` varchar(40) NOT NULL,
  `idempotency_key` varchar(120) NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  `quantity` smallint(5) unsigned NOT NULL DEFAULT 1,
  `unit_price_minor` bigint(20) unsigned NOT NULL,
  `total_minor` bigint(20) unsigned NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'XAF',
  `status` enum('pending','processing','delivered','failed','refunded') NOT NULL DEFAULT 'pending',
  `delivery_reference` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `public_ref` (`public_ref`),
  UNIQUE KEY `idempotency_key` (`idempotency_key`),
  KEY `fk_order_product` (`product_id`),
  KEY `idx_order_user` (`user_id`,`created_at`),
  CONSTRAINT `fk_order_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `fk_order_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `support_tickets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `public_ref` varchar(40) NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `transaction_ref` varchar(40) DEFAULT NULL,
  `category` enum('support','fraud','dispute','card_compromised','other') NOT NULL DEFAULT 'support',
  `subject` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `status` enum('open','in_review','waiting_customer','resolved','closed') NOT NULL DEFAULT 'open',
  `assigned_to` bigint(20) unsigned DEFAULT NULL,
  `resolution` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `public_ref` (`public_ref`),
  KEY `fk_ticket_assignee` (`assigned_to`),
  KEY `idx_ticket_user` (`user_id`,`created_at`),
  KEY `idx_ticket_status` (`status`,`created_at`),
  CONSTRAINT `fk_ticket_assignee` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_ticket_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_sessions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `session_hash` char(64) NOT NULL,
  `device_label` varchar(160) NOT NULL,
  `last_seen_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `revoked_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_hash` (`session_hash`),
  KEY `idx_session_user` (`user_id`,`revoked_at`),
  CONSTRAINT `fk_session_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `email` varchar(190) NOT NULL,
  `phone` varchar(32) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('customer','support','operations','finance','compliance','technical_admin','super_admin') NOT NULL DEFAULT 'customer',
  `status` enum('active','suspended','pending_verification') NOT NULL DEFAULT 'active',
  `email_verified_at` datetime DEFAULT NULL,
  `kyc_status` enum('not_started','pending','approved','rejected') NOT NULL DEFAULT 'not_started',
  `risk_level` enum('low','medium','high') NOT NULL DEFAULT 'low',
  `mfa_secret` varchar(120) DEFAULT NULL,
  `mfa_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `account_key` varchar(140) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `currency` char(3) NOT NULL DEFAULT 'XAF',
  `account_type` enum('customer','clearing','revenue') NOT NULL DEFAULT 'customer',
  `label` varchar(120) NOT NULL DEFAULT 'Compte principal',
  `available_minor` bigint(20) NOT NULL DEFAULT 0,
  `reserved_minor` bigint(20) NOT NULL DEFAULT 0,
  `status` enum('active','frozen') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_key` (`account_key`),
  UNIQUE KEY `uq_customer_wallet` (`user_id`,`currency`,`account_type`),
  KEY `idx_wallet_type` (`account_type`,`currency`),
  CONSTRAINT `fk_wallet_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `withdrawal_orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `public_ref` varchar(40) NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `beneficiary_id` bigint(20) unsigned NOT NULL,
  `provider` varchar(80) NOT NULL,
  `provider_reference` varchar(120) DEFAULT NULL,
  `idempotency_key` varchar(120) NOT NULL,
  `amount_minor` bigint(20) unsigned NOT NULL,
  `fee_minor` bigint(20) unsigned NOT NULL DEFAULT 0,
  `currency` char(3) NOT NULL DEFAULT 'XAF',
  `status` enum('pending','succeeded','failed','reversed','review_required') NOT NULL DEFAULT 'pending',
  `risk_decision` varchar(80) NOT NULL DEFAULT 'sandbox_review',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `public_ref` (`public_ref`),
  UNIQUE KEY `idempotency_key` (`idempotency_key`),
  UNIQUE KEY `provider_reference` (`provider_reference`),
  KEY `fk_withdraw_beneficiary` (`beneficiary_id`),
  KEY `idx_withdraw_user` (`user_id`,`created_at`),
  KEY `idx_withdraw_status` (`status`,`created_at`),
  CONSTRAINT `fk_withdraw_beneficiary` FOREIGN KEY (`beneficiary_id`) REFERENCES `beneficiaries` (`id`),
  CONSTRAINT `fk_withdraw_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

