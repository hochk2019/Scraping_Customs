CREATE TABLE IF NOT EXISTS `uploadedFileAnalyses` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `uploadedFileId` int NOT NULL,
  `analysisJson` text,
  `extractedDataJson` text,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `uploadedFileAnalyses_uploadedFileId_unique` UNIQUE (`uploadedFileId`)
);
