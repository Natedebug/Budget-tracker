import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileImage, Receipt as ReceiptIcon } from "lucide-react";
import type { Receipt } from "@shared/schema";

interface AnalysisData {
  vendor?: string;
  date?: string;
  lineItems?: Array<{
    description: string;
    quantity?: number;
    unit?: string;
    price?: number;
    total?: number;
  }>;
  subtotal?: number;
  tax?: number;
  total?: number;
}

interface ReceiptPreviewProps {
  receipt: Receipt;
}

export function ReceiptPreview({ receipt }: ReceiptPreviewProps) {
  const [showDialog, setShowDialog] = useState(false);
  const analysisData = receipt.analysisData as AnalysisData | null;

  const isImage = receipt.mimeType.startsWith("image/");

  return (
    <>
      <Card
        className="cursor-pointer hover-elevate active-elevate-2"
        onClick={() => setShowDialog(true)}
        data-testid={`card-receipt-${receipt.id}`}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
              {isImage ? (
                <img
                  src={`/api/receipts/${receipt.id}/image`}
                  alt="Receipt thumbnail"
                  className="w-full h-full object-cover"
                  data-testid={`img-receipt-thumbnail-${receipt.id}`}
                />
              ) : (
                <FileImage className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium truncate">
                  {analysisData?.vendor || "Unknown Vendor"}
                </p>
                <Badge variant="secondary" className="flex-shrink-0">
                  <ReceiptIcon className="w-3 h-3 mr-1" />
                  Receipt
                </Badge>
              </div>
              {analysisData?.date && (
                <p className="text-xs text-muted-foreground">{analysisData.date}</p>
              )}
              {analysisData?.total !== undefined && (
                <p className="text-sm font-semibold mt-1" data-testid={`text-receipt-total-${receipt.id}`}>
                  ${analysisData.total.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isImage && (
              <div className="rounded-md overflow-hidden border">
                <img
                  src={`/api/receipts/${receipt.id}/image`}
                  alt="Receipt"
                  className="w-full h-auto"
                  data-testid={`img-receipt-full-${receipt.id}`}
                />
              </div>
            )}

            {analysisData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {analysisData.vendor && (
                    <div>
                      <p className="text-sm text-muted-foreground">Vendor</p>
                      <p className="text-base font-medium">{analysisData.vendor}</p>
                    </div>
                  )}
                  {analysisData.date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="text-base font-medium">{analysisData.date}</p>
                    </div>
                  )}
                </div>

                {analysisData.lineItems && analysisData.lineItems.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Line Items</p>
                    <div className="space-y-2">
                      {analysisData.lineItems.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-start p-2 rounded bg-muted/50"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.description}</p>
                            {item.quantity && item.unit && (
                              <p className="text-xs text-muted-foreground">
                                {item.quantity} {item.unit}
                                {item.price !== undefined && ` @ $${item.price.toFixed(2)}`}
                              </p>
                            )}
                          </div>
                          {item.total !== undefined && (
                            <p className="text-sm font-semibold ml-3">
                              ${item.total.toFixed(2)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-3 border-t">
                  {analysisData.subtotal !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">${analysisData.subtotal.toFixed(2)}</span>
                    </div>
                  )}
                  {analysisData.tax !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium">${analysisData.tax.toFixed(2)}</span>
                    </div>
                  )}
                  {analysisData.total !== undefined && (
                    <div className="flex justify-between text-base font-semibold pt-2 border-t">
                      <span>Total</span>
                      <span>${analysisData.total.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground pt-2 border-t">
              <p>File: {receipt.originalFilename}</p>
              <p>Uploaded: {new Date(receipt.uploadedAt).toLocaleString()}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
