import OpenAI from "openai";
import { readFileSync } from "fs";

interface ReceiptLineItem {
  description: string;
  quantity: number;
  unit: string;
  price: number; // unit price
  total: number; // total price for line item
}

export interface ReceiptAnalysisData {
  vendor: string;
  date: string;
  lineItems: ReceiptLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
}

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export async function analyzeReceipt(filePath: string): Promise<ReceiptAnalysisData> {
  try {
    const imageBuffer = readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');
    
    const mimeType = getMimeType(filePath);
    
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this receipt image and extract the following information in JSON format:
- vendor: The name of the vendor/store
- date: The date of the transaction (YYYY-MM-DD format)
- lineItems: An array of items purchased, each with:
  - description: Item name/description
  - quantity: Quantity purchased (as a number)
  - unit: Unit of measurement (e.g., "kg", "units", "hours", "each", "lbs")
  - price: Price per unit (as a number)
  - total: Total price for this line item (quantity × price, as a number)
- subtotal: Subtotal amount before tax (as a number)
- tax: Tax amount (as a number)
- total: Total amount (as a number)
- currency: Currency code (e.g., "USD")

If any field cannot be determined, use null for that field. For lineItems, do your best to extract as many items as possible. 
Always use numbers for quantity, price, total, subtotal, and tax fields - not strings.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    const analysisData = JSON.parse(content) as ReceiptAnalysisData;
    return analysisData;
  } catch (error) {
    console.error("Error analyzing receipt:", error);
    throw new Error(`Failed to analyze receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function getMimeType(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      return 'image/jpeg';
  }
}
