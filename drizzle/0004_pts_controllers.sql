-- PTS controller ↔ station mapping table
CREATE TABLE `pts_controllers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ptsId` varchar(64) NOT NULL,
	`stationId` int NOT NULL,
	`label` varchar(128),
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSeenAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pts_controllers_id` PRIMARY KEY(`id`),
	CONSTRAINT `pts_controllers_ptsId_unique` UNIQUE(`ptsId`)
);
