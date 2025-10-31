CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentNumber` varchar(100) NOT NULL,
	`customsDocId` varchar(50) NOT NULL,
	`title` text,
	`documentType` varchar(100),
	`issuingAgency` varchar(200),
	`issueDate` varchar(20),
	`signer` varchar(200),
	`fileUrl` text,
	`fileName` varchar(255),
	`summary` text,
	`detailUrl` text,
	`status` enum('pending','downloaded','failed') DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`downloadedAt` timestamp,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `documents_documentNumber_unique` UNIQUE(`documentNumber`)
);
--> statement-breakpoint
CREATE TABLE `exportSelections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`documentId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exportSelections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scrapeLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scrapeType` enum('manual','scheduled') NOT NULL,
	`startTime` timestamp NOT NULL DEFAULT (now()),
	`endTime` timestamp,
	`documentsFound` int DEFAULT 0,
	`documentsDownloaded` int DEFAULT 0,
	`status` enum('running','completed','failed') DEFAULT 'running',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scrapeLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scrapeSchedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`cronExpression` varchar(100) NOT NULL,
	`isActive` int DEFAULT 1,
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scrapeSchedules_id` PRIMARY KEY(`id`)
);
