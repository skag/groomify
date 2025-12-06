/**
 * Device Management Component
 * Handles Square Terminal device pairing and management
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Smartphone, Trash2, RefreshCw } from "lucide-react";
import { integrationService } from "@/services/integrationService";
import type { PaymentDevice } from "@/types/integration";

interface DeviceManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeviceManagement({ open, onOpenChange }: DeviceManagementProps) {
  const [devices, setDevices] = useState<PaymentDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [showPairingDialog, setShowPairingDialog] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [deviceCodeId, setDeviceCodeId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Check if in sandbox mode
  const isSandbox = import.meta.env.VITE_SQUARE_ENVIRONMENT === 'sandbox';

  // Load devices when dialog opens
  useEffect(() => {
    if (open) {
      loadDevices();
    }
  }, [open]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const deviceList = await integrationService.getDevices();
      setDevices(deviceList);
    } catch (error) {
      toast.error("Failed to load devices");
      console.error("Load devices error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startDevicePairing = async () => {
    if (!deviceName.trim()) {
      toast.error("Please enter a device name");
      return;
    }

    setIsPairing(true);
    try {
      const response = await integrationService.pairDevice({
        device_name: deviceName.trim(),
      });

      setPairingCode(response.pairing_code);
      setDeviceCodeId(response.device_id);

      // Start polling for pairing status
      const interval = setInterval(() => {
        checkPairingStatus(response.device_id);
      }, 3000); // Poll every 3 seconds

      setPollingInterval(interval);
    } catch (error) {
      toast.error("Failed to start device pairing");
      console.error("Pairing error:", error);
      setIsPairing(false);
    }
  };

  const checkPairingStatus = async (deviceCodeId: string) => {
    try {
      const status = await integrationService.checkPairingStatus({
        device_code_id: deviceCodeId,
      });

      if (status.status === "PAIRED") {
        // Success! Stop polling
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }

        toast.success("Device paired successfully!");
        setPairingCode(null);
        setDeviceCodeId(null);
        setDeviceName("");
        setShowPairingDialog(false);
        setIsPairing(false);

        // Reload devices list
        loadDevices();
      }
    } catch (error) {
      console.error("Status check error:", error);
      // Continue polling even on error
    }
  };

  const cancelPairing = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setPairingCode(null);
    setDeviceCodeId(null);
    setDeviceName("");
    setShowPairingDialog(false);
    setIsPairing(false);
  };

  const handleRemoveDevice = async (deviceId: number) => {
    if (!confirm("Are you sure you want to remove this device?")) {
      return;
    }

    try {
      await integrationService.unpairDevice(deviceId);
      toast.success("Device removed successfully");
      loadDevices();
    } catch (error) {
      toast.error("Failed to remove device");
      console.error("Remove device error:", error);
    }
  };

  const handlePairTestDevice = async () => {
    if (!deviceName.trim()) {
      toast.error("Please enter a device name");
      return;
    }

    setIsPairing(true);
    try {
      const response = await integrationService.pairTestDevice({
        device_name: deviceName.trim(),
        test_device_id: `SANDBOX_TERMINAL_${Date.now()}`,
      });

      toast.success(response.message || "Test device paired successfully!");
      setDeviceName("");
      setShowPairingDialog(false);
      loadDevices();
    } catch (error) {
      toast.error("Failed to pair test device");
      console.error("Test device pairing error:", error);
    } finally {
      setIsPairing(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Payment Devices</DialogTitle>
            <DialogDescription>
              Add and manage Square Terminal devices for your business
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add Device Button */}
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Connected Devices</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setIsTestMode(false);
                    setShowPairingDialog(true);
                  }}
                  disabled={isPairing}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Device
                </Button>
                {isSandbox && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsTestMode(true);
                      setShowPairingDialog(true);
                    }}
                    disabled={isPairing}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Pair Test Device
                  </Button>
                )}
              </div>
            </div>

            {/* Devices List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Smartphone className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No devices connected</p>
                <p className="text-sm">Add a Square Terminal to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{device.device_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {device.device_id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={device.is_active ? "default" : "secondary"}>
                        {device.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDevice(device.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Refresh Button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={loadDevices}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Device Pairing Dialog */}
      <Dialog open={showPairingDialog} onOpenChange={(open) => {
        setShowPairingDialog(open);
        if (!open) {
          setIsTestMode(false);
          setDeviceName("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isTestMode ? "Pair Test Device (Sandbox)" : "Pair Square Terminal"}
            </DialogTitle>
            <DialogDescription>
              {isTestMode
                ? "Create a test device for sandbox testing (no physical terminal required)"
                : "Enter the device code on your Square Terminal to pair it"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!pairingCode ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="device-name">Device Name</Label>
                  <Input
                    id="device-name"
                    placeholder="e.g., Front Desk Terminal"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    disabled={isPairing}
                  />
                  <p className="text-sm text-muted-foreground">
                    Give this device a recognizable name
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={isTestMode ? handlePairTestDevice : startDevicePairing}
                    disabled={isPairing || !deviceName.trim()}
                    className="flex-1"
                  >
                    {isPairing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isTestMode ? "Creating Test Device..." : "Generating Code..."}
                      </>
                    ) : (
                      isTestMode ? "Create Test Device" : "Generate Pairing Code"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPairingDialog(false);
                      setIsTestMode(false);
                      setDeviceName("");
                    }}
                    disabled={isPairing}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center space-y-4">
                  <div className="p-6 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      Enter this code on your Square Terminal:
                    </p>
                    <p className="text-4xl font-bold font-mono tracking-wider">
                      {pairingCode}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Waiting for device to pair...
                  </div>

                  <p className="text-xs text-muted-foreground">
                    On your Square Terminal, go to Settings → Hardware → Pair Device
                    and enter the code above.
                  </p>
                </div>

                <Button variant="outline" onClick={cancelPairing} className="w-full">
                  Cancel Pairing
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
