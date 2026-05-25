-- Migration 0006: CCTV tables, pump_price_changes, stations PTS-2 fields

-- Pump price change audit log
CREATE TABLE IF NOT EXISTS `pump_price_changes` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `stationId` int NOT NULL,
  `pumpId` int,
  `fuelTypeId` int NOT NULL,
  `oldPrice` decimal(10,2) NOT NULL,
  `newPrice` decimal(10,2) NOT NULL,
  `reason` text,
  `changedByUserId` int NOT NULL,
  `changedByName` varchar(255),
  `effectiveAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CCTV cameras
CREATE TABLE IF NOT EXISTS `cameras` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `stationId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `channelNumber` int NOT NULL,
  `location` varchar(255),
  `streamUrl` text,
  `snapshotUrl` text,
  `status` enum('online','offline','fault') NOT NULL DEFAULT 'offline',
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Camera events
CREATE TABLE IF NOT EXISTS `camera_events` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `cameraId` int NOT NULL,
  `stationId` int NOT NULL,
  `eventType` enum('motion','offline','online','tamper') NOT NULL,
  `description` text,
  `snapshotUrl` text,
  `isResolved` boolean NOT NULL DEFAULT false,
  `resolvedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Camera recordings
CREATE TABLE IF NOT EXISTS `camera_recordings` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `cameraId` int NOT NULL,
  `stationId` int NOT NULL,
  `startTime` timestamp NOT NULL,
  `endTime` timestamp,
  `durationSeconds` int,
  `fileUrl` text,
  `fileSize` bigint,
  `isStarred` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Camera detection zones
CREATE TABLE IF NOT EXISTS `camera_zones` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `cameraId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `coordinates` json,
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add PTS-2 fields and logoUrl to stations
ALTER TABLE `stations`
  ADD COLUMN IF NOT EXISTS `logoUrl` text AFTER `licenseNumber`,
  ADD COLUMN IF NOT EXISTS `pts2Host` varchar(255) AFTER `logoUrl`,
  ADD COLUMN IF NOT EXISTS `pts2Port` int DEFAULT 80 AFTER `pts2Host`,
  ADD COLUMN IF NOT EXISTS `pts2Username` varchar(128) AFTER `pts2Port`,
  ADD COLUMN IF NOT EXISTS `pts2Password` varchar(128) AFTER `pts2Username`,
  ADD COLUMN IF NOT EXISTS `pts2SyncEnabled` boolean DEFAULT false AFTER `pts2Password`,
  ADD COLUMN IF NOT EXISTS `pts2LastSync` timestamp AFTER `pts2SyncEnabled`,
  ADD COLUMN IF NOT EXISTS `pts2FirmwareVersion` varchar(64) AFTER `pts2LastSync`,
  ADD COLUMN IF NOT EXISTS `pts2SerialNumber` varchar(64) AFTER `pts2FirmwareVersion`;
