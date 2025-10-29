// Referenced from javascript_database blueprint for DatabaseStorage implementation
import { 
  projects, 
  timesheets, 
  progressReports, 
  equipmentLogs,
  subcontractorEntries,
  overheadEntries,
  materials,
  users,
  receipts,
  receiptLinks,
  employees,
  gmailConnection,
  type Project, 
  type InsertProject,
  type Timesheet,
  type InsertTimesheet,
  type ProgressReport,
  type InsertProgressReport,
  type EquipmentLog,
  type InsertEquipmentLog,
  type SubcontractorEntry,
  type InsertSubcontractorEntry,
  type OverheadEntry,
  type InsertOverheadEntry,
  type Material,
  type InsertMaterial,
  type User,
  type UpsertUser,
  type Receipt,
  type InsertReceipt,
  type ReceiptLink,
  type InsertReceiptLink,
  type Employee,
  type InsertEmployee,
  type GmailConnection,
  type InsertGmailConnection,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (IMPORTANT - mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Projects
  getAllProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;

  // Timesheets
  getProjectTimesheets(projectId: string): Promise<Timesheet[]>;
  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;

  // Progress Reports
  getProjectProgressReports(projectId: string): Promise<ProgressReport[]>;
  createProgressReport(report: InsertProgressReport): Promise<ProgressReport>;
  createProgressReportWithMaterials(report: InsertProgressReport, materials: InsertMaterial[]): Promise<ProgressReport>;

  // Equipment Logs
  getProjectEquipmentLogs(projectId: string): Promise<EquipmentLog[]>;
  createEquipmentLog(log: InsertEquipmentLog): Promise<EquipmentLog>;

  // Subcontractor Entries
  getProjectSubcontractorEntries(projectId: string): Promise<SubcontractorEntry[]>;
  createSubcontractorEntry(entry: InsertSubcontractorEntry): Promise<SubcontractorEntry>;

  // Overhead Entries
  getProjectOverheadEntries(projectId: string): Promise<OverheadEntry[]>;
  createOverheadEntry(entry: InsertOverheadEntry): Promise<OverheadEntry>;

  // Materials
  getProgressReportMaterials(reportId: string): Promise<Material[]>;
  getProjectMaterials(projectId: string): Promise<Material[]>;
  createMaterial(material: InsertMaterial): Promise<Material>;

  // Receipts
  createReceipt(receipt: InsertReceipt): Promise<Receipt>;
  updateReceiptAnalysis(id: string, updates: { analysisData?: any; status?: Receipt["status"] }): Promise<Receipt>;
  createReceiptLink(link: InsertReceiptLink): Promise<ReceiptLink>;
  getProjectReceipts(projectId: string): Promise<Receipt[]>;
  getReceiptById(id: string): Promise<Receipt | undefined>;
  deleteReceipt(id: string): Promise<void>;

  // Employees
  getAllEmployees(): Promise<Employee[]>;
  getActiveEmployees(): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee>;
  deleteEmployee(id: string): Promise<void>;

  // Gmail Connection (single company inbox)
  getGmailConnection(): Promise<GmailConnection | undefined>;
  createGmailConnection(connection: InsertGmailConnection): Promise<GmailConnection>;
  updateGmailConnection(id: string, connection: Partial<InsertGmailConnection>): Promise<GmailConnection>;
  deleteGmailConnection(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT - mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Projects
  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(insertProject)
      .returning();
    return project;
  }

  // Timesheets
  async getProjectTimesheets(projectId: string): Promise<Timesheet[]> {
    return await db
      .select()
      .from(timesheets)
      .where(eq(timesheets.projectId, projectId))
      .orderBy(desc(timesheets.date), desc(timesheets.createdAt));
  }

  async createTimesheet(insertTimesheet: InsertTimesheet): Promise<Timesheet> {
    const [timesheet] = await db
      .insert(timesheets)
      .values(insertTimesheet)
      .returning();
    return timesheet;
  }

  // Progress Reports
  async getProjectProgressReports(projectId: string): Promise<ProgressReport[]> {
    return await db
      .select()
      .from(progressReports)
      .where(eq(progressReports.projectId, projectId))
      .orderBy(desc(progressReports.date), desc(progressReports.createdAt));
  }

  async createProgressReport(insertReport: InsertProgressReport): Promise<ProgressReport> {
    const [report] = await db
      .insert(progressReports)
      .values(insertReport)
      .returning();
    return report;
  }

  async createProgressReportWithMaterials(
    insertReport: InsertProgressReport,
    insertMaterials: InsertMaterial[]
  ): Promise<ProgressReport> {
    return await db.transaction(async (tx) => {
      // Create progress report
      const [report] = await tx
        .insert(progressReports)
        .values(insertReport)
        .returning();

      // Create all materials linked to this report
      if (insertMaterials.length > 0) {
        await tx.insert(materials).values(
          insertMaterials.map((material) => ({
            ...material,
            progressReportId: report.id,
          }))
        );
      }

      return report;
    });
  }

  // Equipment Logs
  async getProjectEquipmentLogs(projectId: string): Promise<EquipmentLog[]> {
    return await db
      .select()
      .from(equipmentLogs)
      .where(eq(equipmentLogs.projectId, projectId))
      .orderBy(desc(equipmentLogs.date), desc(equipmentLogs.createdAt));
  }

  async createEquipmentLog(insertLog: InsertEquipmentLog): Promise<EquipmentLog> {
    const [log] = await db
      .insert(equipmentLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  // Subcontractor Entries
  async getProjectSubcontractorEntries(projectId: string): Promise<SubcontractorEntry[]> {
    return await db
      .select()
      .from(subcontractorEntries)
      .where(eq(subcontractorEntries.projectId, projectId))
      .orderBy(desc(subcontractorEntries.date), desc(subcontractorEntries.createdAt));
  }

  async createSubcontractorEntry(insertEntry: InsertSubcontractorEntry): Promise<SubcontractorEntry> {
    const [entry] = await db
      .insert(subcontractorEntries)
      .values(insertEntry)
      .returning();
    return entry;
  }

  // Overhead Entries
  async getProjectOverheadEntries(projectId: string): Promise<OverheadEntry[]> {
    return await db
      .select()
      .from(overheadEntries)
      .where(eq(overheadEntries.projectId, projectId))
      .orderBy(desc(overheadEntries.date), desc(overheadEntries.createdAt));
  }

  async createOverheadEntry(insertEntry: InsertOverheadEntry): Promise<OverheadEntry> {
    const [entry] = await db
      .insert(overheadEntries)
      .values(insertEntry)
      .returning();
    return entry;
  }

  // Materials
  async getProgressReportMaterials(reportId: string): Promise<Material[]> {
    return await db
      .select()
      .from(materials)
      .where(eq(materials.progressReportId, reportId));
  }

  async getProjectMaterials(projectId: string): Promise<Material[]> {
    // Get all materials from all progress reports for this project
    const projectReports = await db
      .select()
      .from(progressReports)
      .where(eq(progressReports.projectId, projectId));
    
    if (projectReports.length === 0) {
      return [];
    }

    const reportIds = projectReports.map(r => r.id);
    const allMaterials = await db
      .select()
      .from(materials)
      .where(
        sql`${materials.progressReportId} IN (${sql.join(reportIds.map(id => sql`${id}`), sql`, `)})`
      );
    
    return allMaterials;
  }

  async createMaterial(insertMaterial: InsertMaterial): Promise<Material> {
    const [material] = await db
      .insert(materials)
      .values(insertMaterial)
      .returning();
    return material;
  }

  // Receipts
  async createReceipt(insertReceipt: InsertReceipt): Promise<Receipt> {
    const [receipt] = await db
      .insert(receipts)
      .values(insertReceipt)
      .returning();
    return receipt;
  }

  async updateReceiptAnalysis(id: string, updates: { analysisData?: any; status?: Receipt["status"] }): Promise<Receipt> {
    const updatePayload: Partial<Pick<Receipt, 'status' | 'analysisData'>> = {};

    if (Object.prototype.hasOwnProperty.call(updates, "analysisData")) {
      updatePayload.analysisData = updates.analysisData;
    }

    if (updates.status) {
      updatePayload.status = updates.status;
    } else if (Object.prototype.hasOwnProperty.call(updates, "analysisData")) {
      updatePayload.status = 'analyzed';
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new Error("No updates provided for receipt analysis");
    }

    const [receipt] = await db
      .update(receipts)
      .set(updatePayload)
      .where(eq(receipts.id, id))
      .returning();
    return receipt;
  }

  async createReceiptLink(insertLink: InsertReceiptLink): Promise<ReceiptLink> {
    const [link] = await db
      .insert(receiptLinks)
      .values(insertLink)
      .returning();
    return link;
  }

  async getProjectReceipts(projectId: string): Promise<Receipt[]> {
    return await db
      .select()
      .from(receipts)
      .where(eq(receipts.projectId, projectId))
      .orderBy(desc(receipts.uploadedAt));
  }

  async getReceiptById(id: string): Promise<Receipt | undefined> {
    const [receipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, id));
    return receipt || undefined;
  }

  async deleteReceipt(id: string): Promise<void> {
    await db.delete(receipts).where(eq(receipts.id, id));
  }

  // Employees
  async getAllEmployees(): Promise<Employee[]> {
    return await db
      .select()
      .from(employees)
      .orderBy(desc(employees.createdAt));
  }

  async getActiveEmployees(): Promise<Employee[]> {
    return await db
      .select()
      .from(employees)
      .where(eq(employees.isActive, true))
      .orderBy(employees.name);
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, id));
    return employee || undefined;
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const [employee] = await db
      .insert(employees)
      .values(insertEmployee)
      .returning();
    return employee;
  }

  async updateEmployee(id: string, updateData: Partial<InsertEmployee>): Promise<Employee> {
    const [employee] = await db
      .update(employees)
      .set(updateData)
      .where(eq(employees.id, id))
      .returning();
    return employee;
  }

  async deleteEmployee(id: string): Promise<void> {
    // Soft delete - just mark as inactive
    await db
      .update(employees)
      .set({ isActive: false })
      .where(eq(employees.id, id));
  }

  // Gmail Connection (single company inbox)
  // IMPORTANT: This enforces a single active connection model. Only one Gmail
  // connection can be active at any time for the entire company.
  async getGmailConnection(): Promise<GmailConnection | undefined> {
    const [connection] = await db
      .select()
      .from(gmailConnection)
      .where(eq(gmailConnection.isActive, true))
      .limit(1);
    return connection || undefined;
  }

  async createGmailConnection(insertConnection: InsertGmailConnection): Promise<GmailConnection> {
    // Enforce single connection: use PostgreSQL advisory lock to serialize all connection creates
    // This prevents concurrent transactions from creating multiple active connections
    // Advisory lock ID: hashCode("gmail_connection_singleton") = 1234567890
    return await db.transaction(async (tx) => {
      // Acquire advisory lock (automatically released at transaction end)
      // This serializes all createGmailConnection calls, even when table is empty
      await tx.execute(sql`SELECT pg_advisory_xact_lock(1234567890)`);
      
      // Deactivate ALL existing active connections
      await tx
        .update(gmailConnection)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(gmailConnection.isActive, true));
      
      // Insert the new connection
      const [connection] = await tx
        .insert(gmailConnection)
        .values(insertConnection)
        .returning();
      
      return connection;
    });
  }

  async updateGmailConnection(id: string, updateData: Partial<InsertGmailConnection>): Promise<GmailConnection> {
    const [connection] = await db
      .update(gmailConnection)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(gmailConnection.id, id))
      .returning();
    return connection;
  }

  async deleteGmailConnection(id: string): Promise<void> {
    // Soft delete - just mark as inactive
    await db
      .update(gmailConnection)
      .set({ 
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(gmailConnection.id, id));
  }
}

export const storage = new DatabaseStorage();
