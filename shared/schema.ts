import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, date, integer, timestamp, jsonb, index, boolean } from "drizzle-orm/pg-core";
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

// Employees table
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  companyEmail: varchar("company_email"),
  payRate: decimal("pay_rate", { precision: 8, scale: 2 }).notNull(),
  hasCompanyCard: boolean("has_company_card").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Gmail connection table - tracks the company Gmail inbox for receipt auto-import
// IMPORTANT: Only ONE active connection is supported. This is enforced via:
// 1. PostgreSQL advisory lock (pg_advisory_xact_lock) in storage.createGmailConnection()
//    This serializes all connection creation attempts, even when table is empty
// 2. Frontend UI shows only one connection
// 3. API endpoints designed for single connection
export const gmailConnection = pgTable("gmail_connection", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  gmailEmail: varchar("gmail_email").notNull(), // The company inbox email
  description: text("description"), // e.g., "Company receipts inbox"
  isActive: boolean("is_active").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at"),
  syncStatus: text("sync_status").default("pending"), // pending, syncing, success, error
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

// Categories table for organizing costs within projects
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color"), // Hex color for visual identification
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Change orders table for tracking budget adjustments
export const changeOrders = pgTable("change_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  changeOrderNumber: text("change_order_number").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("Pending"), // Pending, Approved, Rejected
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Timesheets table
export const timesheets = pgTable("timesheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: "set null" }),
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
  photoUrls: text("photo_urls").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Materials table (linked to progress reports)
export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  progressReportId: varchar("progress_report_id").notNull().references(() => progressReports.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: "set null" }),
  itemName: text("item_name").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  photoUrl: text("photo_url"),
});

// Equipment logs table
export const equipmentLogs = pgTable("equipment_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: "set null" }),
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
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: "set null" }),
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
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Receipts table
export const receipts = pgTable("receipts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  status: text("status").notNull().default("uploaded"), // uploaded, processing, analyzed, failed
  analysisData: jsonb("analysis_data"), // Structured receipt data from AI
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

// Receipt links table (polymorphic join)
export const receiptLinks = pgTable("receipt_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  receiptId: varchar("receipt_id").notNull().references(() => receipts.id, { onDelete: "cascade" }),
  entryType: text("entry_type").notNull(), // material, equipment, subcontractor, overhead
  entryId: varchar("entry_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  timesheets: many(timesheets),
  progressReports: many(progressReports),
  equipmentLogs: many(equipmentLogs),
  subcontractorEntries: many(subcontractorEntries),
  overheadEntries: many(overheadEntries),
  receipts: many(receipts),
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

export const receiptsRelations = relations(receipts, ({ one, many }) => ({
  project: one(projects, {
    fields: [receipts.projectId],
    references: [projects.id],
  }),
  links: many(receiptLinks),
}));

export const receiptLinksRelations = relations(receiptLinks, ({ one }) => ({
  receipt: one(receipts, {
    fields: [receiptLinks.receiptId],
    references: [receipts.id],
  }),
}));

export const employeesRelations = relations(employees, ({ many }) => ({
  timesheets: many(timesheets),
}));

export const gmailConnectionRelations = relations(gmailConnection, ({ one }) => ({
  user: one(users, {
    fields: [gmailConnection.userId],
    references: [users.id],
  }),
}));

// Insert schemas with coercion for numeric fields
export const insertProjectSchema = createInsertSchema(projects, {
  totalBudget: z.coerce.number().positive().transform(String),
  laborBudget: z.coerce.number().nonnegative().transform(String),
  materialsBudget: z.coerce.number().nonnegative().transform(String),
  equipmentBudget: z.coerce.number().nonnegative().transform(String),
  subcontractorsBudget: z.coerce.number().nonnegative().transform(String),
  overheadBudget: z.coerce.number().nonnegative().transform(String),
}).omit({
  id: true,
  createdAt: true,
});

export const insertTimesheetSchema = createInsertSchema(timesheets, {
  hours: z.coerce.number().positive().transform(String),
  payRate: z.coerce.number().positive().transform(String),
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
  quantity: z.coerce.number().positive().transform(String),
  cost: z.coerce.number().nonnegative().transform(String),
}).omit({
  id: true,
});

export const insertEquipmentLogSchema = createInsertSchema(equipmentLogs, {
  hours: z.coerce.number().positive().transform(String),
  fuelCost: z.coerce.number().nonnegative().transform(String),
  rentalCost: z.coerce.number().nonnegative().transform(String),
}).omit({
  id: true,
  createdAt: true,
});

export const insertSubcontractorEntrySchema = createInsertSchema(subcontractorEntries, {
  cost: z.coerce.number().positive().transform(String),
}).omit({
  id: true,
  createdAt: true,
});

export const insertOverheadEntrySchema = createInsertSchema(overheadEntries, {
  cost: z.coerce.number().positive().transform(String),
}).omit({
  id: true,
  createdAt: true,
});

export const insertReceiptSchema = createInsertSchema(receipts, {
  fileSize: z.number().int().positive(),
}).omit({
  id: true,
  uploadedAt: true,
});

export const insertReceiptLinkSchema = createInsertSchema(receiptLinks).omit({
  id: true,
  createdAt: true,
});

export const insertEmployeeSchema = createInsertSchema(employees, {
  payRate: z.coerce.number().positive().transform(String),
}).omit({
  id: true,
  createdAt: true,
});

export const insertGmailConnectionSchema = createInsertSchema(gmailConnection).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertChangeOrderSchema = createInsertSchema(changeOrders, {
  amount: z.coerce.number().positive().transform(String),
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

export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;

export type ReceiptLink = typeof receiptLinks.$inferSelect;
export type InsertReceiptLink = z.infer<typeof insertReceiptLinkSchema>;

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type GmailConnection = typeof gmailConnection.$inferSelect;
export type InsertGmailConnection = z.infer<typeof insertGmailConnectionSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type ChangeOrder = typeof changeOrders.$inferSelect;
export type InsertChangeOrder = z.infer<typeof insertChangeOrderSchema>;

// Replit Auth - User types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
