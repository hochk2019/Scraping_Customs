CREATE TABLE `referenceData` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dataType` varchar(100) NOT NULL,
	`hsCode` varchar(20),
	`title` text NOT NULL,
	`content` text,
	`source` varchar(255),
	`language` varchar(10) DEFAULT 'vi',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referenceData_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `uploadedFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`fileType` varchar(50) NOT NULL,
	`filePath` varchar(255) NOT NULL,
	`fileSize` int,
	`status` varchar(50) DEFAULT 'pending',
	`extractedCount` int DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `uploadedFiles_id` PRIMARY KEY(`id`)
);
