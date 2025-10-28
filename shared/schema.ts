import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, date, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Replit Auth - Session storage table
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Replit Auth - User storage table
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  totalBudget: decimal("total_budget", { precision: 12, scale: 2 }).notNull(),
  laborBudget: decimal("labor_budget", { precision: 12, scale: 2 }).notNull(),
  materialsBudget: decimal("materials_budget", { precision: 12, scale: 2 }).notNull(),
  equipmentBudget: decimal("equipment_budget", { precision: 12, scale: 2 }).notNull(),
  subcontractorsBudget: decimal("subcontractors_budget", { precision: 12, scale: 2 }).notNull(),
  overheadBudget: decimal("overhead_budget", { precision: 12, scale: 2 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Timesheets table
export const timesheets = pgTable("timesheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  employeeName: text("employee_name").notNull(),
  hours: decimal("hours", { precision: 5, scale: 2 }).notNull(),
  payRate: decimal("pay_rate", { precision: 8, scale: 2 }).notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Progress reports table
export const progressReports = pgTable("progress_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  percentComplete: integer("percent_complete").notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Materials table (linked to progress reports)
export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  progressReportId: varchar("progress_report_id").notNull().references(() => progressReports.id, { onDelete: "cascade" }),
  itemName: text("item_name").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
});

// Equipment logs table
export const equipmentLogs = pgTable("equipment_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  equipmentName: text("equipment_name").notNull(),
  hours: decimal("hours", { precision: 6, scale: 2 }).notNull(),
  fuelCost: decimal("fuel_cost", { precision: 8, scale: 2 }).notNull().default("0"),
  rentalCost: decimal("rental_cost", { precision: 8, scale: 2 }).notNull().default("0"),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Subcontractor entries table
export const subcontractorEntries = pgTable("subcontractor_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  contractorName: text("contractor_name").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Overhead entries table
export const overheadEntries = pgTable("overhead_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  timesheets: many(timesheets),
  progressReports: many(progressReports),
  equipmentLogs: many(equipmentLogs),
  subcontractorEntries: many(subcontractorEntries),
  overheadEntries: many(overheadEntries),
}));

export const timesheetsRelations = relations(timesheets, ({ one }) => ({
  project: one(projects, {
    fields: [timesheets.projectId],
    references: [projects.id],
  }),
}));

export const progressReportsRelations = relations(progressReports, ({ one, many }) => ({
  project: one(projects, {
    fields: [progressReports.projectId],
    references: [projects.id],
  }),
  materials: many(materials),
}));

export const materialsRelations = relations(materials, ({ one }) => ({
  progressReport: one(progressReports, {
    fields: [materials.progressReportId],
    references: [progressReports.id],
  }),
}));

export const equipmentLogsRelations = relations(equipmentLogs, ({ one }) => ({
  project: one(projects, {
    fields: [equipmentLogs.projectId],
    references: [projects.id],
  }),
}));

export const subcontractorEntriesRelations = relations(subcontractorEntries, ({ one }) => ({
  project: one(projects, {
    fields: [subcontractorEntries.projectId],
    references: [projects.id],
  }),
}));

export const overheadEntriesRelations = relations(overheadEntries, ({ one }) => ({
  project: one(projects, {
    fields: [overheadEntries.projectId],
    references: [projects.id],
  }),
}));

// Insert schemas with coercion for numeric fields
export const insertProjectSchema = createInsertSchema(projects, {
  totalBudget: z.coerce.number().positive(),
  laborBudget: z.coerce.number().nonnegative(),
  materialsBudget: z.coerce.number().nonnegative(),
  equipmentBudget: z.coerce.number().nonnegative(),
  subcontractorsBudget: z.coerce.number().nonnegative(),
  overheadBudget: z.coerce.number().nonnegative(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertTimesheetSchema = createInsertSchema(timesheets, {
  hours: z.coerce.number().positive(),
  payRate: z.coerce.number().positive(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertProgressReportSchema = createInsertSchema(progressReports, {
  percentComplete: z.coerce.number().int().min(0).max(100),
}).omit({
  id: true,
  createdAt: true,
});

export const insertMaterialSchema = createInsertSchema(materials, {
  quantity: z.coerce.number().positive(),
  cost: z.coerce.number().nonnegative(),
}).omit({
  id: true,
});

export const insertEquipmentLogSchema = createInsertSchema(equipmentLogs, {
  hours: z.coerce.number().positive(),
  fuelCost: z.coerce.number().nonnegative(),
  rentalCost: z.coerce.number().nonnegative(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertSubcontractorEntrySchema = createInsertSchema(subcontractorEntries, {
  cost: z.coerce.number().positive(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertOverheadEntrySchema = createInsertSchema(overheadEntries, {
  cost: z.coerce.number().positive(),
}).omit({
  id: true,
  createdAt: true,
});

// Types
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Timesheet = typeof timesheets.$inferSelect;
export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;

export type ProgressReport = typeof progressReports.$inferSelect;
export type InsertProgressReport = z.infer<typeof insertProgressReportSchema>;

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;

export type EquipmentLog = typeof equipmentLogs.$inferSelect;
export type InsertEquipmentLog = z.infer<typeof insertEquipmentLogSchema>;

export type SubcontractorEntry = typeof subcontractorEntries.$inferSelect;
export type InsertSubcontractorEntry = z.infer<typeof insertSubcontractorEntrySchema>;

export type OverheadEntry = typeof overheadEntries.$inferSelect;
export type InsertOverheadEntry = z.infer<typeof insertOverheadEntrySchema>;

// Replit Auth - User types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
