CREATE TABLE IF NOT EXISTS `scrapeJobs` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `jobId` varchar(64) NOT NULL,
  `documentId` int,
  `type` enum('scrape','ocr','ai') NOT NULL,
  `payload` text,
  `status` enum('pending','processing','completed','failed') DEFAULT 'pending',
  `retryCount` int DEFAULT 0,
  `errorMessage` text,
  `startedAt` timestamp NULL,
  `completedAt` timestamp NULL,
  `durationMs` int,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `scrapeJobs_jobId_idx` UNIQUE (`jobId`)
);

CREATE TABLE IF NOT EXISTS `ocrJobs` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `jobId` varchar(64) NOT NULL,
  `documentId` int NOT NULL,
  `engine` varchar(100) DEFAULT 'builtin',
  `durationMs` int DEFAULT 0,
  `confidence` double DEFAULT 0,
  `status` enum('pending','processing','completed','failed') DEFAULT 'pending',
  `logs` text,
  `errorMessage` text,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `ocrJobs_jobId_idx` UNIQUE (`jobId`)
);

CREATE TABLE IF NOT EXISTS `aiJobs` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `jobId` varchar(64) NOT NULL,
  `documentId` int NOT NULL,
  `model` varchar(100) DEFAULT 'openai',
  `suggestions` text,
  `confidence` double DEFAULT 0,
  `status` enum('pending','processing','completed','failed') DEFAULT 'pending',
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `aiJobs_jobId_idx` UNIQUE (`jobId`)
);

CREATE TABLE IF NOT EXISTS `documentEmbeddings` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `documentId` int NOT NULL,
  `embeddingVector` text NOT NULL,
  `model` varchar(100) NOT NULL,
  `version` varchar(50) DEFAULT 'v1',
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `documentEmbeddings_document_idx` UNIQUE (`documentId`)
);
