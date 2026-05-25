-- Migration 0005: add companies table, companyId to stations/users,
-- passwordHash + unique email to users, update role enum to multi-tenant roles

CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(32) NOT NULL,
	`country` varchar(64) DEFAULT 'Uganda',
	`phone` varchar(32),
	`email` varchar(320),
	`address` text,
	`logoUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`),
	CONSTRAINT `companies_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `users`
  ADD COLUMN `passwordHash` varchar(255) AFTER `email`,
  ADD COLUMN `companyId` int AFTER `stationId`,
  ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);
--> statement-breakpoint
ALTER TABLE `users`
  MODIFY COLUMN `role` enum('super_admin','company_owner','company_admin','manager','supervisor','accountant','technician','attendant','user') NOT NULL DEFAULT 'user';
--> statement-breakpoint
ALTER TABLE `stations`
  ADD COLUMN `companyId` int AFTER `id`;
