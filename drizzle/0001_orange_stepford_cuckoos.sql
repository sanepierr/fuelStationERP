CREATE TABLE `credit_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountNumber` varchar(32) NOT NULL,
	`customerName` varchar(255) NOT NULL,
	`companyName` varchar(255),
	`phone` varchar(32),
	`email` varchar(320),
	`creditLimit` decimal(12,2) NOT NULL DEFAULT '0',
	`currentBalance` decimal(12,2) NOT NULL DEFAULT '0',
	`stationId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credit_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `credit_accounts_accountNumber_unique` UNIQUE(`accountNumber`)
);
--> statement-breakpoint
CREATE TABLE `credit_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creditNoteNumber` varchar(32) NOT NULL,
	`stationId` int NOT NULL,
	`creditAccountId` int,
	`customerName` varchar(255) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`reason` text,
	`relatedTransactionId` int,
	`issuedByUserId` int,
	`status` enum('draft','issued','applied','cancelled') NOT NULL DEFAULT 'draft',
	`issuedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_notes_id` PRIMARY KEY(`id`),
	CONSTRAINT `credit_notes_creditNoteNumber_unique` UNIQUE(`creditNoteNumber`)
);
--> statement-breakpoint
CREATE TABLE `fuel_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deliveryOrderNumber` varchar(32) NOT NULL,
	`stationId` int NOT NULL,
	`tankId` int NOT NULL,
	`fuelTypeId` int NOT NULL,
	`depotName` varchar(255),
	`supplierName` varchar(255),
	`truckNumber` varchar(32),
	`driverName` varchar(128),
	`orderedVolume` decimal(12,3) NOT NULL,
	`dispatchedVolume` decimal(12,3),
	`receivedVolume` decimal(12,3),
	`tankLevelBefore` decimal(10,2),
	`tankLevelAfter` decimal(10,2),
	`pricePerLitre` decimal(10,4),
	`totalCost` decimal(14,2),
	`status` enum('ordered','dispatched','in_transit','delivered','verified','cancelled') NOT NULL DEFAULT 'ordered',
	`dispatchedAt` timestamp,
	`deliveredAt` timestamp,
	`verifiedAt` timestamp,
	`verifiedByUserId` int,
	`receivedByUserId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fuel_deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `fuel_deliveries_deliveryOrderNumber_unique` UNIQUE(`deliveryOrderNumber`)
);
--> statement-breakpoint
CREATE TABLE `fuel_prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stationId` int NOT NULL,
	`fuelTypeId` int NOT NULL,
	`pricePerUnit` decimal(10,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'UGX',
	`effectiveFrom` timestamp NOT NULL DEFAULT (now()),
	`effectiveTo` timestamp,
	`setByUserId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fuel_prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fuel_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`code` varchar(16) NOT NULL,
	`unit` varchar(16) NOT NULL DEFAULT 'litres',
	`color` varchar(16) DEFAULT '#f59e0b',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fuel_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `fuel_types_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceNumber` varchar(32) NOT NULL,
	`fromUserId` int NOT NULL,
	`toStationId` int,
	`toUserId` int,
	`clientName` varchar(255) NOT NULL,
	`clientEmail` varchar(320),
	`items` json NOT NULL,
	`subtotal` decimal(12,2) NOT NULL,
	`taxAmount` decimal(10,2) DEFAULT '0',
	`totalAmount` decimal(12,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'UGX',
	`status` enum('draft','sent','paid','overdue','cancelled') NOT NULL DEFAULT 'draft',
	`dueDate` timestamp,
	`notes` text,
	`pdfUrl` text,
	`sentAt` timestamp,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoiceNumber_unique` UNIQUE(`invoiceNumber`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerNumber` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`email` varchar(320),
	`nfcCardId` varchar(64),
	`rfidCardId` varchar(64),
	`totalPoints` int NOT NULL DEFAULT 0,
	`totalFuelPurchased` decimal(14,3) DEFAULT '0',
	`totalAmountSpent` decimal(14,2) DEFAULT '0',
	`tier` enum('bronze','silver','gold','platinum') NOT NULL DEFAULT 'bronze',
	`isActive` boolean NOT NULL DEFAULT true,
	`registeredStationId` int,
	`registeredByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loyalty_customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `loyalty_customers_customerNumber_unique` UNIQUE(`customerNumber`),
	CONSTRAINT `loyalty_customers_nfcCardId_unique` UNIQUE(`nfcCardId`),
	CONSTRAINT `loyalty_customers_rfidCardId_unique` UNIQUE(`rfidCardId`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`transactionId` int,
	`type` enum('earn','redeem','expire','adjust') NOT NULL DEFAULT 'earn',
	`points` int NOT NULL,
	`balanceBefore` int NOT NULL,
	`balanceAfter` int NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyalty_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`type` enum('info','warning','alert','success') NOT NULL DEFAULT 'info',
	`isRead` boolean NOT NULL DEFAULT false,
	`link` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prepaid_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountNumber` varchar(32) NOT NULL,
	`customerId` int,
	`customerName` varchar(255),
	`balance` decimal(12,2) NOT NULL DEFAULT '0',
	`currency` varchar(8) NOT NULL DEFAULT 'UGX',
	`isActive` boolean NOT NULL DEFAULT true,
	`stationId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prepaid_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `prepaid_accounts_accountNumber_unique` UNIQUE(`accountNumber`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stationId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`sku` varchar(64),
	`category` enum('gas','lubes','tyres','accessories','food','other') NOT NULL DEFAULT 'other',
	`unit` varchar(32) NOT NULL DEFAULT 'unit',
	`sellingPrice` decimal(10,2) NOT NULL,
	`costPrice` decimal(10,2),
	`stockQuantity` decimal(12,3) NOT NULL DEFAULT '0',
	`minStockLevel` decimal(10,3) DEFAULT '0',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pump_attendants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stationId` int NOT NULL,
	`employeeId` varchar(32) NOT NULL,
	`nfcCardId` varchar(64),
	`rfidCardId` varchar(64),
	`isActive` boolean NOT NULL DEFAULT true,
	`assignedPumps` json,
	`hiredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pump_attendants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pumps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stationId` int NOT NULL,
	`tankId` int NOT NULL,
	`name` varchar(64) NOT NULL,
	`serialNumber` varchar(64),
	`nozzleCount` int NOT NULL DEFAULT 1,
	`status` enum('active','inactive','maintenance','fault') NOT NULL DEFAULT 'active',
	`totalizer` decimal(14,3) DEFAULT '0',
	`lastMaintenanceAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pumps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rtt_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rttNumber` varchar(32) NOT NULL,
	`stationId` int NOT NULL,
	`pumpId` int,
	`technicianId` int,
	`supervisorId` int,
	`fuelTypeId` int,
	`volume` decimal(10,3),
	`reason` text NOT NULL,
	`status` enum('pending','approved','rejected','reconciled') NOT NULL DEFAULT 'pending',
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`reconciledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rtt_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `rtt_transactions_rttNumber_unique` UNIQUE(`rttNumber`)
);
--> statement-breakpoint
CREATE TABLE `shift_attendants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shiftId` int NOT NULL,
	`attendantId` int NOT NULL,
	`pumpId` int,
	`openingTotalizer` decimal(14,3),
	`closingTotalizer` decimal(14,3),
	`totalVolumeSold` decimal(12,3),
	`totalSalesAmount` decimal(12,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shift_attendants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stationId` int NOT NULL,
	`shiftName` varchar(64) NOT NULL,
	`supervisorId` int,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp,
	`status` enum('active','closed','reconciled') NOT NULL DEFAULT 'active',
	`openingCash` decimal(12,2) DEFAULT '0',
	`closingCash` decimal(12,2),
	`totalSales` decimal(14,2) DEFAULT '0',
	`totalFuelVolume` decimal(12,3) DEFAULT '0',
	`notes` text,
	`reportGeneratedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(32) NOT NULL,
	`address` text,
	`city` varchar(128),
	`country` varchar(64) DEFAULT 'Uganda',
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`phone` varchar(32),
	`email` varchar(320),
	`ownerId` int,
	`managerId` int,
	`status` enum('active','inactive','maintenance') NOT NULL DEFAULT 'active',
	`hikVisionHost` text,
	`hikVisionUsername` varchar(128),
	`hikVisionPassword` varchar(128),
	`atgHost` text,
	`atgPort` int DEFAULT 10001,
	`tinNumber` varchar(64),
	`licenseNumber` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stations_id` PRIMARY KEY(`id`),
	CONSTRAINT `stations_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `tank_readings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tankId` int NOT NULL,
	`stationId` int NOT NULL,
	`level` decimal(10,2) NOT NULL,
	`temperature` decimal(5,2),
	`waterLevel` decimal(8,2),
	`source` enum('atg','manual','delivery') NOT NULL DEFAULT 'manual',
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`recordedByUserId` int,
	CONSTRAINT `tank_readings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tanks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stationId` int NOT NULL,
	`fuelTypeId` int NOT NULL,
	`name` varchar(64) NOT NULL,
	`capacity` decimal(10,2) NOT NULL,
	`currentLevel` decimal(10,2) NOT NULL DEFAULT '0',
	`minLevel` decimal(10,2) DEFAULT '500',
	`maxLevel` decimal(10,2),
	`atgSensorId` varchar(64),
	`status` enum('normal','low','critical','overfill','maintenance') NOT NULL DEFAULT 'normal',
	`lastReadingAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tanks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`userId` int NOT NULL,
	`comment` text NOT NULL,
	`isInternal` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ticket_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketNumber` varchar(32) NOT NULL,
	`stationId` int,
	`raisedByUserId` int NOT NULL,
	`assignedToUserId` int,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`category` enum('technical','billing','operational','maintenance','other') NOT NULL DEFAULT 'other',
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`resolvedAt` timestamp,
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `tickets_ticketNumber_unique` UNIQUE(`ticketNumber`)
);
--> statement-breakpoint
CREATE TABLE `transaction_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transactionId` int NOT NULL,
	`productId` int,
	`productName` varchar(255) NOT NULL,
	`quantity` decimal(10,3) NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL,
	`totalPrice` decimal(12,2) NOT NULL,
	CONSTRAINT `transaction_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`receiptNumber` varchar(32) NOT NULL,
	`stationId` int NOT NULL,
	`shiftId` int,
	`pumpId` int,
	`attendantId` int,
	`customerId` int,
	`loyaltyCardId` varchar(64),
	`transactionType` enum('fuel_sale','product_sale','prepaid_topup','credit_sale','rtt') NOT NULL DEFAULT 'fuel_sale',
	`paymentMethod` enum('cash','mtn_momo','airtel_money','visa','credit','prepaid','mixed') NOT NULL DEFAULT 'cash',
	`fuelTypeId` int,
	`fuelVolume` decimal(10,3),
	`pricePerUnit` decimal(10,2),
	`subtotal` decimal(12,2) NOT NULL,
	`taxAmount` decimal(10,2) DEFAULT '0',
	`discountAmount` decimal(10,2) DEFAULT '0',
	`totalAmount` decimal(12,2) NOT NULL,
	`loyaltyPointsEarned` int DEFAULT 0,
	`loyaltyPointsRedeemed` int DEFAULT 0,
	`mobileMoneyRef` varchar(64),
	`mobileMoneyPhone` varchar(32),
	`status` enum('pending','completed','cancelled','refunded','failed') NOT NULL DEFAULT 'completed',
	`qrCode` text,
	`uraVerificationCode` varchar(64),
	`notes` text,
	`transactedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `transactions_receiptNumber_unique` UNIQUE(`receiptNumber`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','owner','manager','supervisor','accountant','technician','attendant','user') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `stationId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;