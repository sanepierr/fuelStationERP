-- audit_logs table
CREATE TABLE `audit_logs` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(64) NOT NULL,
	`entity` varchar(64) NOT NULL,
	`entityId` int,
	`stationId` int,
	`before` json,
	`after` json,
	`ipAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

-- PTS integration columns on transactions
ALTER TABLE `transactions`
	ADD COLUMN `tcVolume` decimal(10,3),
	ADD COLUMN `ptsTransactionId` varchar(64),
	ADD COLUMN `ptsPumpNumber` int,
	ADD COLUMN `ptsNozzle` int,
	ADD COLUMN `ptsTotalizerVolume` decimal(14,3),
	ADD COLUMN `ptsTotalizerAmount` decimal(14,2);
--> statement-breakpoint

ALTER TABLE `transactions`
	ADD CONSTRAINT `transactions_ptsTransactionId_unique` UNIQUE(`ptsTransactionId`);
