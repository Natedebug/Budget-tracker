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
  insertReceiptSchema,
  insertReceiptLinkSchema,
  insertEmployeeSchema,
  insertGmailConnectionSchema,
} from "@shared/schema";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { analyzeReceipt } from "./services/receiptAnalyzer";
import { scanGmailAccountForReceipts } from "./services/receiptScanner";

// Configure multer for file uploads
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/receipts/');
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG and PNG images are allowed.'));
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

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
      const { materials: materialsData, ...reportData } = req.body;
      
      // Validate progress report data
      const validatedReport = insertProgressReportSchema.parse(reportData);
      
      // Validate materials if provided
      let validatedMaterials: any[] = [];
      if (materialsData && Array.isArray(materialsData)) {
        validatedMaterials = materialsData.map((material: any) => 
          insertMaterialSchema.omit({ progressReportId: true }).parse(material)
        );
      }
      
      // Create progress report with materials in a single transaction
      const report = await storage.createProgressReportWithMaterials(
        validatedReport,
        validatedMaterials
      );
      
      res.status(201).json(report);
    } catch (error) {
      console.error('Progress report creation error:', error);
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
      console.log('Material request body:', JSON.stringify(req.body, null, 2));
      const data = insertMaterialSchema.parse(req.body);
      const material = await storage.createMaterial(data);
      res.status(201).json(material);
    } catch (error) {
      console.error('Material validation error:', error);
      res.status(400).json({ error: "Invalid material data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Receipts
  app.post("/api/receipts", isAuthenticated, upload.single('receipt'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { projectId } = req.body;
      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }

      const receiptData = {
        projectId,
        storagePath: req.file.path,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        status: 'uploaded',
      };

      const receipt = await storage.createReceipt(receiptData);
      res.status(201).json(receipt);
    } catch (error) {
      console.error('Receipt upload error:', error);
      res.status(400).json({ error: "Failed to upload receipt" });
    }
  });

  app.post("/api/receipts/:id/analyze", isAuthenticated, async (req, res) => {
    try {
      const receiptId = req.params.id;
      const receipt = await storage.getReceiptById(receiptId);

      if (!receipt) {
        return res.status(404).json({ error: "Receipt not found" });
      }

      if (receipt.status === 'analyzed') {
        return res.json(receipt);
      }

      const analysisData = await analyzeReceipt(receipt.storagePath);
      const updatedReceipt = await storage.updateReceiptAnalysis(receiptId, analysisData);
      
      res.json(updatedReceipt);
    } catch (error) {
      console.error('Receipt analysis error:', error);
      
      const receiptId = req.params.id;
      const receipt = await storage.getReceiptById(receiptId);
      if (receipt) {
        await storage.updateReceiptAnalysis(receiptId, { error: error instanceof Error ? error.message : 'Analysis failed' });
      }
      
      res.status(500).json({ error: "Failed to analyze receipt" });
    }
  });

  app.post("/api/receipts/:id/link", isAuthenticated, async (req, res) => {
    try {
      const { entryType, entryId } = req.body;
      
      if (!entryType || !entryId) {
        return res.status(400).json({ error: "Entry type and entry ID are required" });
      }

      const validEntryTypes = ['material', 'equipment', 'subcontractor', 'overhead'];
      if (!validEntryTypes.includes(entryType)) {
        return res.status(400).json({ error: "Invalid entry type" });
      }

      const linkData = {
        receiptId: req.params.id,
        entryType,
        entryId,
      };

      const link = await storage.createReceiptLink(linkData);
      res.status(201).json(link);
    } catch (error) {
      console.error('Receipt link creation error:', error);
      res.status(400).json({ error: "Failed to create receipt link" });
    }
  });

  app.get("/api/projects/:projectId/receipts", isAuthenticated, async (req, res) => {
    try {
      const receipts = await storage.getProjectReceipts(req.params.projectId);
      res.json(receipts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch receipts" });
    }
  });

  app.get("/api/receipts/:id", isAuthenticated, async (req, res) => {
    try {
      const receipt = await storage.getReceiptById(req.params.id);
      if (!receipt) {
        return res.status(404).json({ error: "Receipt not found" });
      }
      res.json(receipt);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch receipt" });
    }
  });

  app.get("/api/receipts/:id/image", isAuthenticated, async (req, res) => {
    try {
      const receipt = await storage.getReceiptById(req.params.id);
      if (!receipt) {
        return res.status(404).json({ error: "Receipt not found" });
      }
      res.sendFile(path.resolve(receipt.storagePath));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch receipt image" });
    }
  });

  app.delete("/api/receipts/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteReceipt(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete receipt" });
    }
  });

  // Employees
  app.get("/api/employees", isAuthenticated, async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/active", isAuthenticated, async (req, res) => {
    try {
      const employees = await storage.getActiveEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active employees" });
    }
  });

  app.get("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", isAuthenticated, async (req, res) => {
    try {
      const data = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(data);
      res.status(201).json(employee);
    } catch (error) {
      console.error('Employee creation error:', error);
      res.status(400).json({ error: "Invalid employee data" });
    }
  });

  app.patch("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const employee = await storage.updateEmployee(req.params.id, req.body);
      res.json(employee);
    } catch (error) {
      console.error('Employee update error:', error);
      res.status(400).json({ error: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteEmployee(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete employee" });
    }
  });

  // Gmail Connection (single company inbox)
  app.get("/api/gmail-connection", isAuthenticated, async (req, res) => {
    try {
      const connection = await storage.getGmailConnection();
      res.json(connection || null);
    } catch (error) {
      console.error('Gmail connection fetch error:', error);
      res.status(500).json({ error: "Failed to fetch Gmail connection" });
    }
  });

  app.post("/api/gmail-connection", isAuthenticated, async (req: any, res) => {
    try {
      // Add current user ID to the connection data
      const userId = req.user.claims.sub;
      const data = insertGmailConnectionSchema.parse({
        ...req.body,
        userId,
      });
      const connection = await storage.createGmailConnection(data);
      res.status(201).json(connection);
    } catch (error) {
      console.error('Gmail connection creation error:', error);
      res.status(400).json({ error: "Invalid Gmail connection data" });
    }
  });

  app.delete("/api/gmail-connection/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteGmailConnection(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Gmail connection delete error:', error);
      res.status(500).json({ error: "Failed to delete Gmail connection" });
    }
  });

  // Trigger manual sync for the Gmail connection
  app.post("/api/gmail-connection/sync", isAuthenticated, async (req, res) => {
    try {
      const connection = await storage.getGmailConnection();
      if (!connection) {
        return res.status(404).json({ error: "No Gmail connection found. Please connect a Gmail account first." });
      }
      
      // Get the project ID from the request body
      const projectId = req.body.projectId;
      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }
      
      // Start the scan asynchronously
      // Don't wait for it to complete to avoid timeout
      scanGmailAccountForReceipts(connection.id, projectId)
        .then((result) => {
          console.log('Gmail scan completed:', result);
        })
        .catch((error) => {
          console.error('Gmail scan failed:', error);
        });
      
      res.json({ 
        message: "Sync initiated", 
        status: "Scanning emails in the background..." 
      });
    } catch (error) {
      console.error('Gmail sync error:', error);
      res.status(500).json({ error: "Failed to initiate sync" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
