CREATE INDEX `todos_created_at_idx` ON `todos` (`createdAt`);--> statement-breakpoint
CREATE INDEX `todos_completed_idx` ON `todos` (`completed`);--> statement-breakpoint
CREATE INDEX `todos_priority_idx` ON `todos` (`priority`);--> statement-breakpoint
CREATE INDEX `todos_completed_created_at_idx` ON `todos` (`completed`,`createdAt`);