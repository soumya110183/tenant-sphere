import { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { MinusCircle, Camera } from "lucide-react";
import { createPortal } from "react-dom";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

type Product = {
  inventory_id: number;
  product_id: number;
  name: string;
  sku: string;
  barcode: string;
  selling_price: number;
  tax: number;
  quantity: number;
};

type BillRow = {
  code: string;
  name: string;
  qty: number | "";
  price: number;
  tax: number;
  total: number;
  product_id?: number | null;
};

export const BillingTable = ({
  rows,
  products,
  onRowsChange,
  onAddRow,
  onDeleteRow,
}: {
  rows: BillRow[];
  products: Product[];
  onRowsChange: (rows: BillRow[]) => void;
  onAddRow: () => void;
  onDeleteRow: (index: number) => void;
}) => {
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentInputIndex, setCurrentInputIndex] = useState<number | null>(
    null
  );

  const inputRefs = useRef<HTMLInputElement[]>([]);
  const suggestionRef = useRef<HTMLDivElement | null>(null);
  const [portalPos, setPortalPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerIndex, setScannerIndex] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>("");
  const [useManual, setUseManual] = useState<boolean>(false);

  const getMatchingProducts = (term: string) => {
    if (!term || term.length < 1) return [];
    const lower = term.toLowerCase();

    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.barcode?.toLowerCase().includes(lower) ||
          p.sku?.toLowerCase().includes(lower)
      )
      .slice(0, 8);
  };

  const handleItemCodeChange = (index: number, value: string) => {
    const updated = [...rows];
    updated[index].code = value;

    const matches = getMatchingProducts(value);
    setSuggestions(matches);
    setCurrentInputIndex(index);
    const shouldShow = matches.length > 0;
    setShowSuggestions(shouldShow);

    // compute portal position when suggestions are shown
    if (shouldShow) {
      const el = inputRefs.current[index];
      if (el) {
        const rect = el.getBoundingClientRect();
        setPortalPos({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    } else {
      setPortalPos(null);
    }

    if (!value.trim()) {
      updated[index].name = "";
      updated[index].price = 0;
      updated[index].tax = 0;
      updated[index].total = 0;
      updated[index].product_id = null;
      onRowsChange(updated);
      return;
    }

    const exactMatch = products.find(
      (p) =>
        p.name.toLowerCase() === value.toLowerCase() ||
        p.barcode === value ||
        p.sku === value ||
        p.product_id.toString() === value
    );

    if (exactMatch) {
      updated[index].code = exactMatch.name;
      updated[index].name = exactMatch.name;
      updated[index].price = Number(exactMatch.selling_price || 0);
      updated[index].tax = Number(exactMatch.tax || 0);
      updated[index].product_id = exactMatch.product_id;
      updated[index].total = (updated[index].qty || 0) * updated[index].price;

      setShowSuggestions(false);
      setPortalPos(null);
    } else {
      updated[index].name = "";
      updated[index].price = 0;
      updated[index].tax = 0;
      updated[index].total = 0;
      updated[index].product_id = null;
    }

    // If the user pasted/scanned a barcode (likely numeric or longer), try to auto-select by barcode
    if (!exactMatch && value && value.length >= 6) {
      const byBarcode = products.find(
        (p) =>
          p.barcode === value ||
          p.sku === value ||
          String(p.product_id) === value
      );
      if (byBarcode) {
        updated[index].code = byBarcode.name;
        updated[index].name = byBarcode.name;
        updated[index].price = Number(byBarcode.selling_price || 0);
        updated[index].tax = Number(byBarcode.tax || 0);
        updated[index].product_id = byBarcode.product_id;
        updated[index].total = (updated[index].qty || 0) * updated[index].price;
      }
    }

    onRowsChange(updated);
  };

  // Open scanner modal for a given row
  function openScannerForRow(index: number) {
    setScannerIndex(index);
    setShowScanner(true);
  }

  async function startCameraAndDetect(onDetected: (code: string) => void) {
    // Use BarcodeDetector API when available
    try {
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      if (!BarcodeDetectorClass)
        throw new Error("BarcodeDetector not supported");

      detectorRef.current = new BarcodeDetectorClass({
        formats: [
          "ean_13",
          "ean_8",
          "code_128",
          "upc_a",
          "upc_e",
          "code_39",
          "code_93",
        ],
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      let running = true;

      const loop = async () => {
        if (!running) return;
        try {
          if (!videoRef.current) return;
          const detections = await detectorRef.current.detect(videoRef.current);
          if (detections && detections.length) {
            const code =
              detections[0].rawValue ||
              detections[0].raw_string ||
              detections[0].value;
            if (code) {
              running = false;
              onDetected(String(code));
              return;
            }
          }
        } catch (e) {
          // ignore intermittent detection errors
        }
        setTimeout(loop, 300);
      };

      loop();

      return () => {
        running = false;
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch (e) {}
        if (videoRef.current) {
          try {
            videoRef.current.pause();
            videoRef.current.srcObject = null;
          } catch (e) {}
        }
      };
    } catch (err) {
      // BarcodeDetector not supported or camera failed
      throw err;
    }
  }

  // Clean up camera when modal closes
  async function stopCamera() {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      detectorRef.current = null;
    } catch (e) {
      // ignore
    }
  }

  // Start scanner when modal opens
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (showScanner && scannerIndex !== null) {
      startCameraAndDetect(async (code: string) => {
        // fill the input with detected code and run change handler
        handleItemCodeChange(scannerIndex, String(code));
        setShowScanner(false);
        setScannerIndex(null);
        if (cleanup) cleanup();
      })
        .then((c) => {
          cleanup = c;
        })
        .catch((err) => {
          console.warn("Scanner start failed:", err);
          // Show error in modal and allow retry or manual entry
          const msg = err?.message || String(err);
          setScannerError(msg);
        });
    }

    return () => {
      if (cleanup) cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showScanner, scannerIndex]);

  const handleSuggestionClick = (product: Product) => {
    if (currentInputIndex === null) return;

    const updated = [...rows];

    updated[currentInputIndex].code = product.name;
    updated[currentInputIndex].name = product.name;
    updated[currentInputIndex].price = Number(product.selling_price || 0);
    updated[currentInputIndex].tax = Number(product.tax || 0);
    updated[currentInputIndex].product_id = product.product_id;

    updated[currentInputIndex].total =
      Number(product.selling_price || 0) *
      Number(updated[currentInputIndex].qty || 0);

    onRowsChange(updated);

    setShowSuggestions(false);
    setCurrentInputIndex(null);

    // Auto-focus next row
    if (currentInputIndex === updated.length - 1) {
      onAddRow();
      setTimeout(() => inputRefs.current[currentInputIndex + 1]?.focus(), 100);
    } else {
      inputRefs.current[currentInputIndex + 1]?.focus();
    }
  };

  const handleQtyChange = (index: number, value: string) => {
    const updated = [...rows];
    if (value === "" || value === null) {
      updated[index].qty = "";
      updated[index].total = 0;
    } else {
      const qty = Number(value);
      updated[index].qty = qty;
      updated[index].total = qty * updated[index].price;
    }

    onRowsChange(updated);
  };

  // Keep portal position updated on scroll/resize while suggestions are visible
  useEffect(() => {
    if (!showSuggestions || currentInputIndex === null) return;

    const updatePos = () => {
      const el = inputRefs.current[currentInputIndex!];
      if (!el) return setPortalPos(null);
      const rect = el.getBoundingClientRect();
      setPortalPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    };

    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);

    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [showSuggestions, currentInputIndex]);

  return (
<<<<<<< HEAD
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Billing Table</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Code / Name</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="relative">
                    <Input
                      ref={(el) => (inputRefs.current[i] = el!)}
                      value={r.code}
                      onChange={(e) => handleItemCodeChange(i, e.target.value)}
                      placeholder="Enter name, barcode, or SKU"
                    />
=======
    <>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Billing Table</CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code / Name</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="relative">
                      <Input
                        ref={(el) => (inputRefs.current[i] = el!)}
                        value={r.code}
                        onChange={(e) =>
                          handleItemCodeChange(i, e.target.value)
                        }
                        placeholder="Enter name, barcode, or SKU"
                      />
>>>>>>> updates

                      {/* <button
                        type="button"
                        title="Scan barcode"
                        onClick={() => openScannerForRow(i)}
                        className="ml-2 absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded bg-transparent hover:bg-muted/50"
                      >
                        <Camera className="h-4 w-4 text-muted-foreground" />
                      </button> */}

                      {showSuggestions && currentInputIndex === i && (
                        <>
                          {portalPos ? (
                            createPortal(
                              <div
                                ref={suggestionRef}
                                className="bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
                                style={{
                                  position: "absolute",
                                  top: portalPos.top,
                                  left: portalPos.left,
                                  width: portalPos.width,
                                  zIndex: 9999,
                                }}
                              >
                                {suggestions.map((p) => (
                                  <div
                                    key={p.inventory_id}
                                    className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100"
                                    onClick={() => handleSuggestionClick(p)}
                                  >
                                    <div className="font-medium text-sm">
                                      {p.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {p.sku && `SKU: ${p.sku} • `}
                                      {p.barcode && `Barcode: ${p.barcode} • `}
                                      Stock: {p.quantity} • AED{" "}
                                      {p.selling_price}
                                    </div>
                                  </div>
                                ))}
                              </div>,
                              document.body
                            )
                          ) : (
                            <div
                              ref={suggestionRef}
                              className="absolute z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto w-full mt-1"
                            >
                              {suggestions.map((p) => (
                                <div
                                  key={p.inventory_id}
                                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100"
                                  onClick={() => handleSuggestionClick(p)}
                                >
                                  <div className="font-medium text-sm">
                                    {p.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {p.sku && `SKU: ${p.sku} • `}
                                    {p.barcode && `Barcode: ${p.barcode} • `}
                                    Stock: {p.quantity} • AED {p.selling_price}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Input
                      type="number"
                      value={r.qty}
                      onChange={(e) => handleQtyChange(i, e.target.value)}
                      onBlur={() => {
                        if (!rows[i].qty || rows[i].qty === 0) {
                          const updated = [...rows];
                          updated[i].qty = 1;
                          updated[i].total = updated[i].price;
                          onRowsChange(updated);
                        }
                      }}
                    />
                  </TableCell>

                  <TableCell>AED {r.price.toFixed(2)}</TableCell>
                  <TableCell>AED {Number(r.total).toFixed(2)}</TableCell>

                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteRow(i)}
                      disabled={rows.length === 1}
                    >
                      <MinusCircle className="h-5 w-5 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Button variant="outline" onClick={onAddRow} className="mt-4">
            + Add Row
          </Button>
        </CardContent>
      </Card>

      {/* Scanner Modal */}
      {showScanner && scannerIndex !== null && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={async () => {
            setShowScanner(false);
            setScannerIndex(null);
            await stopCamera();
          }}
        >
          <div
            className="bg-background rounded-lg w-full max-w-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Scan Barcode</h3>
              <div>
                <button
                  onClick={async () => {
                    setShowScanner(false);
                    setScannerIndex(null);
                    await stopCamera();
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="w-full h-64 bg-black flex items-center justify-center rounded">
              {!useManual && !scannerError && (
                <video ref={videoRef} className="w-full h-full object-cover" />
              )}

              {scannerError && (
                <div className="text-sm text-center text-red-300 p-4">
                  {`Scanner error: ${scannerError}`}
                </div>
              )}

              {useManual && (
                <div className="w-full p-4">
                  <label className="block text-sm font-medium mb-1">
                    Enter barcode manually
                  </label>
                  <input
                    className="w-full px-3 py-2 border rounded bg-background text-sm"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Scan or paste barcode here"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 text-sm text-muted-foreground">
                Point the camera at a barcode. If unsupported or denied, use
                manual entry.
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    // Retry camera start
                    setScannerError(null);
                    setUseManual(false);
                    try {
                      await startCameraAndDetect(async (code: string) => {
                        if (scannerIndex !== null)
                          handleItemCodeChange(scannerIndex, String(code));
                        setShowScanner(false);
                        setScannerIndex(null);
                      });
                    } catch (e: any) {
                      setScannerError(e?.message || String(e));
                    }
                  }}
                >
                  Retry
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setUseManual((s) => !s);
                    setScannerError(null);
                  }}
                >
                  {useManual ? "Use Camera" : "Use Manual"}
                </Button>

<<<<<<< HEAD
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteRow(i)}
                    disabled={rows.length === 1}
                  >
                    <MinusCircle className="h-5 w-5 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button variant="outline" onClick={onAddRow} className="mt-4">
          + Add Row
        </Button>
      </CardContent>
    </Card>
=======
                <Button
                  size="sm"
                  onClick={() => {
                    if (manualCode && scannerIndex !== null) {
                      handleItemCodeChange(scannerIndex, manualCode);
                      setManualCode("");
                      setShowScanner(false);
                      setScannerIndex(null);
                    }
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
>>>>>>> updates
  );
};
