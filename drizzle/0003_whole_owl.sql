CREATE TABLE `documentHsCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`hsCodeId` int NOT NULL,
	`confidence` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documentHsCodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `extractedData` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`dataType` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`confidence` int DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `extractedData_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hsCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(20) NOT NULL,
	`nameEn` text,
	`nameVi` text,
	`description` text,
	`importTariff` varchar(50),
	`exportTariff` varchar(50),
	`notes` text,
	`referenceCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hsCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `hsCodes_code_unique` UNIQUE(`code`)
);
