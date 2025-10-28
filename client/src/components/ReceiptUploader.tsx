import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileImage, CheckCircle2, XCircle, Camera } from "lucide-react";
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
  error?: string;
}

interface ReceiptUploaderProps {
  projectId: string;
  onApply?: (receipt: Receipt, analysisData: AnalysisData) => void;
  acceptMultipleLineItems?: boolean;
}

export function ReceiptUploader({ projectId, onApply, acceptMultipleLineItems = false }: ReceiptUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedReceipt, setUploadedReceipt] = useState<Receipt | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("receipt", file);
      formData.append("projectId", projectId);

      const response = await fetch("/api/receipts", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to upload receipt");
      }

      return await response.json();
    },
    onSuccess: (receipt: Receipt) => {
      setUploadedReceipt(receipt);
      analyzeMutation.mutate(receipt.id);
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Could not upload receipt. Please try again.",
        variant: "destructive",
      });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (receiptId: string) => {
      const response = await fetch(`/api/receipts/${receiptId}/analyze`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to analyze receipt");
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (receipt: Receipt) => {
      const data = receipt.analysisData as AnalysisData | null;
      setAnalysisData(data);
      if (data && 'error' in data && data.error) {
        toast({
          title: "Analysis Issue",
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Receipt Analyzed",
          description: "Receipt data has been extracted successfully.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Analysis Failed",
        description: "Could not analyze receipt. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }

    uploadMutation.mutate(file);
  };

  const handleApply = () => {
    if (uploadedReceipt && analysisData && onApply) {
      onApply(uploadedReceipt, analysisData);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadedReceipt(null);
    setAnalysisData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isLoading = uploadMutation.isPending || analyzeMutation.isPending;
  const hasAnalysis = analysisData && !analysisData.error;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileImage className="w-5 h-5" />
          Upload Receipt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            data-testid="button-upload-receipt"
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-2" />
            Choose File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-receipt-file"
          />
          {selectedFile && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              disabled={isLoading}
              data-testid="button-reset-receipt"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>

        {selectedFile && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <FileImage className="w-4 h-4 text-muted-foreground" />
              <span className="truncate flex-1" data-testid="text-filename">
                {selectedFile.name}
              </span>
              <Badge variant="secondary">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </Badge>
            </div>

            {previewUrl && (
              <div className="rounded-md overflow-hidden border">
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="w-full h-48 object-contain bg-muted"
                  data-testid="img-receipt-preview"
                />
              </div>
            )}

            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-loading">
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploadMutation.isPending ? "Uploading..." : "Analyzing receipt..."}
              </div>
            )}

            {analysisData && (
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Analysis Results</span>
                    {hasAnalysis ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3" data-testid="text-analysis-result">
                  {analysisData.error ? (
                    <p className="text-sm text-destructive">{analysisData.error}</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {analysisData.vendor && (
                          <div>
                            <p className="text-xs text-muted-foreground">Vendor</p>
                            <p className="text-sm font-medium">{analysisData.vendor}</p>
                          </div>
                        )}
                        {analysisData.date && (
                          <div>
                            <p className="text-xs text-muted-foreground">Date</p>
                            <p className="text-sm font-medium">{analysisData.date}</p>
                          </div>
                        )}
                      </div>

                      {analysisData.lineItems && analysisData.lineItems.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Line Items ({analysisData.lineItems.length})
                          </p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {analysisData.lineItems.map((item, index) => (
                              <div
                                key={index}
                                className="text-sm py-1 px-2 rounded bg-muted/50 flex justify-between"
                              >
                                <span className="truncate flex-1">
                                  {item.description}
                                  {item.quantity && item.unit && ` (${item.quantity} ${item.unit})`}
                                </span>
                                {item.total !== undefined && (
                                  <span className="font-medium ml-2">
                                    ${item.total.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                        {analysisData.subtotal !== undefined && (
                          <div>
                            <p className="text-xs text-muted-foreground">Subtotal</p>
                            <p className="text-sm font-medium">${analysisData.subtotal.toFixed(2)}</p>
                          </div>
                        )}
                        {analysisData.tax !== undefined && (
                          <div>
                            <p className="text-xs text-muted-foreground">Tax</p>
                            <p className="text-sm font-medium">${analysisData.tax.toFixed(2)}</p>
                          </div>
                        )}
                      </div>

                      {analysisData.total !== undefined && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-lg font-semibold">${analysisData.total.toFixed(2)}</p>
                        </div>
                      )}

                      {onApply && (
                        <Button
                          type="button"
                          onClick={handleApply}
                          className="w-full"
                          data-testid="button-apply-receipt"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Apply to Form
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!selectedFile && (
          <div className="text-center py-6 text-sm text-muted-foreground space-y-2">
            <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Upload a receipt to automatically extract data</p>
            <p className="text-xs">Supports JPG, PNG, PDF (max 10MB)</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
