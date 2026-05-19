ALTER TABLE `pump_attendants` MODIFY COLUMN `userId` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `pump_attendants` ADD `name` varchar(128);--> statement-breakpoint
ALTER TABLE `pump_attendants` ADD `phone` varchar(32);