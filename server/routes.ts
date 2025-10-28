import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertProjectSchema, 
  insertTimesheetSchema, 
  insertProgressReportSchema,
  insertEquipmentLogSchema,
  insertSubcontractorEntrySchema,
  insertOverheadEntrySchema,
  insertMaterialSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Replit Auth - Setup authentication
  await setupAuth(app);

  // Replit Auth - User endpoint
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Projects (protected routes)
  app.get("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(data);
      res.status(201).json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  // Budget statistics for a project
  app.get("/api/projects/:id/stats", isAuthenticated, async (req, res) => {
    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const [timesheetData, equipmentData, subcontractorData, overheadData, progressData] = await Promise.all([
        storage.getProjectTimesheets(projectId),
        storage.getProjectEquipmentLogs(projectId),
        storage.getProjectSubcontractorEntries(projectId),
        storage.getProjectOverheadEntries(projectId),
        storage.getProjectProgressReports(projectId),
      ]);

      // Calculate labor costs
      const laborSpent = timesheetData.reduce((sum, entry) => {
        return sum + (parseFloat(entry.hours) * parseFloat(entry.payRate));
      }, 0);

      // Calculate equipment costs
      const equipmentSpent = equipmentData.reduce((sum, entry) => {
        return sum + parseFloat(entry.fuelCost) + parseFloat(entry.rentalCost);
      }, 0);

      // Calculate subcontractor costs
      const subcontractorsSpent = subcontractorData.reduce((sum, entry) => {
        return sum + parseFloat(entry.cost);
      }, 0);

      // Calculate overhead costs
      const overheadSpent = overheadData.reduce((sum, entry) => {
        return sum + parseFloat(entry.cost);
      }, 0);

      // Calculate materials costs from all progress reports
      const allMaterials = await storage.getProjectMaterials(projectId);
      const materialsSpent = allMaterials.reduce((sum, material) => {
        return sum + parseFloat(material.cost);
      }, 0);

      const totalSpent = laborSpent + equipmentSpent + subcontractorsSpent + overheadSpent + materialsSpent;
      const totalBudget = parseFloat(project.totalBudget);
      const remaining = totalBudget - totalSpent;
      const percentUsed = (totalSpent / totalBudget) * 100;

      // Get latest progress percentage
      const latestProgress = progressData.length > 0 ? progressData[0].percentComplete : 0;

      // Calculate daily burn rate (average spend per day)
      const startDate = new Date(project.startDate);
      const today = new Date();
      const daysSinceStart = Math.max(1, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const dailyBurnRate = totalSpent / daysSinceStart;

      // Calculate today's spending
      const todayStr = today.toISOString().split('T')[0];
      const spentToday = [
        ...timesheetData.filter(t => t.date === todayStr).map(t => parseFloat(t.hours) * parseFloat(t.payRate)),
        ...equipmentData.filter(e => e.date === todayStr).map(e => parseFloat(e.fuelCost) + parseFloat(e.rentalCost)),
        ...subcontractorData.filter(s => s.date === todayStr).map(s => parseFloat(s.cost)),
        ...overheadData.filter(o => o.date === todayStr).map(o => parseFloat(o.cost)),
      ].reduce((sum, val) => sum + val, 0);

      // Project completion cost based on current burn rate and progress
      let projectedFinalCost = totalBudget;
      if (latestProgress > 0) {
        projectedFinalCost = (totalSpent / latestProgress) * 100;
      }
      const variance = projectedFinalCost - totalBudget;

      // Days remaining until end date
      let daysRemaining = 0;
      if (project.endDate) {
        const endDate = new Date(project.endDate);
        daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      }

      res.json({
        totalBudget,
        totalSpent,
        spentToday,
        remaining,
        percentUsed,
        percentComplete: latestProgress,
        laborSpent,
        materialsSpent,
        equipmentSpent,
        subcontractorsSpent,
        overheadSpent,
        projectedFinalCost,
        variance,
        dailyBurnRate,
        daysRemaining,
      });
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({ error: "Failed to calculate statistics" });
    }
  });

  // CSV Export
  app.get("/api/projects/:id/export", isAuthenticated, async (req, res) => {
    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const [timesheetData, equipmentData, subcontractorData, overheadData] = await Promise.all([
        storage.getProjectTimesheets(projectId),
        storage.getProjectEquipmentLogs(projectId),
        storage.getProjectSubcontractorEntries(projectId),
        storage.getProjectOverheadEntries(projectId),
      ]);

      // Create CSV content
      let csv = `BudgetSync Field - Project Report\n`;
      csv += `Project: ${project.name}\n`;
      csv += `Start Date: ${project.startDate}\n`;
      csv += `Total Budget: $${parseFloat(project.totalBudget).toLocaleString()}\n\n`;

      // Timesheets
      csv += `TIMESHEETS\n`;
      csv += `Date,Employee,Hours,Pay Rate,Total Cost,Notes\n`;
      timesheetData.forEach(t => {
        const total = parseFloat(t.hours) * parseFloat(t.payRate);
        csv += `${t.date},${t.employeeName},${t.hours},${t.payRate},${total.toFixed(2)},"${t.notes || ''}"\n`;
      });

      csv += `\nEQUIPMENT LOGS\n`;
      csv += `Date,Equipment,Hours,Fuel Cost,Rental Cost,Total Cost,Notes\n`;
      equipmentData.forEach(e => {
        const total = parseFloat(e.fuelCost) + parseFloat(e.rentalCost);
        csv += `${e.date},${e.equipmentName},${e.hours},${e.fuelCost},${e.rentalCost},${total.toFixed(2)},"${e.notes || ''}"\n`;
      });

      csv += `\nSUBCONTRACTORS\n`;
      csv += `Date,Contractor,Cost,Description\n`;
      subcontractorData.forEach(s => {
        csv += `${s.date},${s.contractorName},${s.cost},"${s.description || ''}"\n`;
      });

      csv += `\nOVERHEAD\n`;
      csv += `Date,Description,Cost\n`;
      overheadData.forEach(o => {
        csv += `${o.date},"${o.description}",${o.cost}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="budget-report-${projectId}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Timesheets
  app.get("/api/projects/:id/timesheets", isAuthenticated, async (req, res) => {
    try {
      const timesheets = await storage.getProjectTimesheets(req.params.id);
      res.json(timesheets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch timesheets" });
    }
  });

  app.post("/api/timesheets", isAuthenticated, async (req, res) => {
    try {
      const data = insertTimesheetSchema.parse(req.body);
      const timesheet = await storage.createTimesheet(data);
      res.status(201).json(timesheet);
    } catch (error) {
      res.status(400).json({ error: "Invalid timesheet data" });
    }
  });

  // Progress Reports
  app.get("/api/projects/:id/progress-reports", isAuthenticated, async (req, res) => {
    try {
      const reports = await storage.getProjectProgressReports(req.params.id);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch progress reports" });
    }
  });

  app.post("/api/progress-reports", isAuthenticated, async (req, res) => {
    try {
      const data = insertProgressReportSchema.parse(req.body);
      const report = await storage.createProgressReport(data);
      res.status(201).json(report);
    } catch (error) {
      res.status(400).json({ error: "Invalid progress report data" });
    }
  });

  // Equipment Logs
  app.get("/api/projects/:id/equipment", isAuthenticated, async (req, res) => {
    try {
      const logs = await storage.getProjectEquipmentLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch equipment logs" });
    }
  });

  app.post("/api/equipment", isAuthenticated, async (req, res) => {
    try {
      const data = insertEquipmentLogSchema.parse(req.body);
      const log = await storage.createEquipmentLog(data);
      res.status(201).json(log);
    } catch (error) {
      res.status(400).json({ error: "Invalid equipment log data" });
    }
  });

  // Subcontractor Entries
  app.get("/api/projects/:id/subcontractors", isAuthenticated, async (req, res) => {
    try {
      const entries = await storage.getProjectSubcontractorEntries(req.params.id);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subcontractor entries" });
    }
  });

  app.post("/api/subcontractors", isAuthenticated, async (req, res) => {
    try {
      const data = insertSubcontractorEntrySchema.parse(req.body);
      const entry = await storage.createSubcontractorEntry(data);
      res.status(201).json(entry);
    } catch (error) {
      res.status(400).json({ error: "Invalid subcontractor entry data" });
    }
  });

  // Overhead Entries
  app.get("/api/projects/:id/overhead", isAuthenticated, async (req, res) => {
    try {
      const entries = await storage.getProjectOverheadEntries(req.params.id);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch overhead entries" });
    }
  });

  app.post("/api/overhead", isAuthenticated, async (req, res) => {
    try {
      const data = insertOverheadEntrySchema.parse(req.body);
      const entry = await storage.createOverheadEntry(data);
      res.status(201).json(entry);
    } catch (error) {
      res.status(400).json({ error: "Invalid overhead entry data" });
    }
  });

  // Materials
  app.get("/api/progress-reports/:id/materials", isAuthenticated, async (req, res) => {
    try {
      const materials = await storage.getProgressReportMaterials(req.params.id);
      res.json(materials);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch materials" });
    }
  });

  app.post("/api/materials", isAuthenticated, async (req, res) => {
    try {
      const data = insertMaterialSchema.parse(req.body);
      const material = await storage.createMaterial(data);
      res.status(201).json(material);
    } catch (error) {
      res.status(400).json({ error: "Invalid material data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
