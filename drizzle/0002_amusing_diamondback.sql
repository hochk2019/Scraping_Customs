ALTER TABLE `documents` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `processedStatus` enum('new','processed') DEFAULT 'new';