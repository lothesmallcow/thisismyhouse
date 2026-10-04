CREATE INDEX `catalog_companies_browse_idx` ON `catalog_companies` (`source`,`country`,"size" desc,`name`);--> statement-breakpoint
CREATE INDEX `catalog_companies_sector_idx` ON `catalog_companies` (`sector_id`,`country`,"size" desc);--> statement-breakpoint
CREATE INDEX `catalog_companies_author_idx` ON `catalog_companies` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `catalog_companies_ats_idx` ON `catalog_companies` (`ats`);--> statement-breakpoint
-- Name search without reading every row: a full-text index of the company names (kept in sync by triggers).
CREATE VIRTUAL TABLE `catalog_companies_fts` USING fts5(name, aliases, city, industry, content='catalog_companies', content_rowid='id', tokenize='unicode61 remove_diacritics 2');--> statement-breakpoint
CREATE TRIGGER `catalog_companies_fts_ai` AFTER INSERT ON `catalog_companies` BEGIN
  INSERT INTO `catalog_companies_fts`(rowid, name, aliases, city, industry) VALUES (new.id, new.name, new.aliases, new.city, new.industry);
END;--> statement-breakpoint
CREATE TRIGGER `catalog_companies_fts_ad` AFTER DELETE ON `catalog_companies` BEGIN
  INSERT INTO `catalog_companies_fts`(`catalog_companies_fts`, rowid, name, aliases, city, industry) VALUES ('delete', old.id, old.name, old.aliases, old.city, old.industry);
END;--> statement-breakpoint
CREATE TRIGGER `catalog_companies_fts_au` AFTER UPDATE OF name, aliases, city, industry ON `catalog_companies` BEGIN
  INSERT INTO `catalog_companies_fts`(`catalog_companies_fts`, rowid, name, aliases, city, industry) VALUES ('delete', old.id, old.name, old.aliases, old.city, old.industry);
  INSERT INTO `catalog_companies_fts`(rowid, name, aliases, city, industry) VALUES (new.id, new.name, new.aliases, new.city, new.industry);
END;--> statement-breakpoint
INSERT INTO `catalog_companies_fts`(`catalog_companies_fts`) VALUES ('rebuild');
