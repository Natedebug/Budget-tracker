// Referenced from javascript_database blueprint for DatabaseStorage implementation
import { 
  projects, 
  timesheets, 
  progressReports, 
  equipmentLogs,
  subcontractorEntries,
  overheadEntries,
  materials,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
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
  createMaterial(material: InsertMaterial): Promise<Material>;
}

export class DatabaseStorage implements IStorage {
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

  async createMaterial(insertMaterial: InsertMaterial): Promise<Material> {
    const [material] = await db
      .insert(materials)
      .values(insertMaterial)
      .returning();
    return material;
  }
}

export const storage = new DatabaseStorage();
