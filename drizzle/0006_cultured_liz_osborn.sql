CREATE TABLE `ocrRepository` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`documentNumber` varchar(100) NOT NULL,
	`documentTitle` text,
	`linkUrl` text NOT NULL,
	`status` varchar(50) NOT NULL,
	`extractedText` text,
	`hsCodes` text,
	`productNames` text,
	`textLength` int DEFAULT 0,
	`wordCount` int DEFAULT 0,
	`errorMessage` text,
	`processingTime` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ocrRepository_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ocrStatistics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`totalLinks` int DEFAULT 0,
	`successfulLinks` int DEFAULT 0,
	`failedLinks` int DEFAULT 0,
	`totalHsCodes` int DEFAULT 0,
	`uniqueHsCodes` int DEFAULT 0,
	`totalProductNames` int DEFAULT 0,
	`uniqueProductNames` int DEFAULT 0,
	`totalTextLength` int DEFAULT 0,
	`totalWordCount` int DEFAULT 0,
	`successRate` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ocrStatistics_id` PRIMARY KEY(`id`)
);
