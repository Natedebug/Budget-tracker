// Receipt scanner - processes Gmail emails and extracts receipt data
import { storage } from '../storage';
import { searchReceiptEmails, downloadAttachment, type EmailMessage } from './gmailService';
import { analyzeReceipt } from './receiptAnalyzer';
import { promises as fs } from 'fs';
import * as path from 'path';
import type { InsertReceipt } from '@shared/schema';

export interface ScanResult {
  emailsScanned: number;
  receiptsFound: number;
  receiptsProcessed: number;
  receiptsFailed: number;
  errors: string[];
}

/**
 * Scan emails from the company Gmail inbox and process receipt attachments
 */
export async function scanGmailAccountForReceipts(
  connectionId: string,
  projectId: string
): Promise<ScanResult> {
  const result: ScanResult = {
    emailsScanned: 0,
    receiptsFound: 0,
    receiptsProcessed: 0,
    receiptsFailed: 0,
    errors: [],
  };

  try {
    // Get the Gmail connection details
    const connection = await storage.getGmailConnection();
    if (!connection) {
      throw new Error('Gmail connection not found');
    }

    // Update status to syncing
    await storage.updateGmailConnection(connection.id, {
      syncStatus: 'syncing',
      lastError: null,
    });

    // Get the last sync time, or default to 7 days ago
    const sinceDate = connection.lastSyncAt 
      ? new Date(connection.lastSyncAt)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Search for receipt emails
    const messages = await searchReceiptEmails(sinceDate);
    result.emailsScanned = messages.length;
    result.receiptsFound = messages.reduce((count, msg) => count + msg.attachments.length, 0);

    // Process each message with attachments
    for (const message of messages) {
      for (const attachment of message.attachments) {
        try {
          // Download the attachment
          const filePath = await downloadAttachment(attachment);
          
          // Get file stats
          const stats = await fs.stat(filePath);
          const filename = path.basename(filePath);

          // Create receipt record
          const receiptData: InsertReceipt = {
            projectId,
            storagePath: filePath,
            originalFilename: attachment.filename,
            mimeType: attachment.mimeType,
            fileSize: stats.size,
            status: 'uploaded',
          };

          const receipt = await storage.createReceipt(receiptData);

          // Analyze the receipt
          try {
            const analysisData = await analyzeReceipt(filePath);
            
            // Update receipt with analysis data
            await storage.updateReceiptAnalysis(receipt.id, {
              analysisData,
              status: 'analyzed',
            });
            
            result.receiptsProcessed++;
          } catch (analysisError) {
            console.error('Receipt analysis failed:', analysisError);
            
            // Mark receipt as failed
            await storage.updateReceiptAnalysis(receipt.id, {
              analysisData: {
                error: analysisError instanceof Error ? analysisError.message : 'Analysis failed',
              },
              status: 'failed',
            });
            
            result.receiptsFailed++;
            result.errors.push(`Failed to analyze ${attachment.filename}: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}`);
          }
        } catch (downloadError) {
          console.error('Failed to download attachment:', downloadError);
          result.receiptsFailed++;
          result.errors.push(`Failed to download ${attachment.filename}: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`);
        }
      }
    }

    // Update Gmail connection sync status
    await storage.updateGmailConnection(connection.id, {
      syncStatus: result.receiptsFailed > 0 ? 'error' : 'success',
      lastSyncAt: new Date(),
      lastError: result.errors.length > 0 ? result.errors.join('; ') : null,
    });

  } catch (error) {
    console.error('Gmail scan failed:', error);
    
    const connection = await storage.getGmailConnection();
    if (connection) {
      // Update Gmail connection with error
      await storage.updateGmailConnection(connection.id, {
        syncStatus: 'error',
        lastError: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }

    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}
