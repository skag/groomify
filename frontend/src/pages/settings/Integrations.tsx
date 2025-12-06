import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plug, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { integrationService } from "@/services/integrationService";
import type { PaymentConfiguration, PaymentProvider } from "@/types/integration";
import { DeviceManagement } from "@/components/DeviceManagement";

export default function IntegrationsSettings() {
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDeviceManagement, setShowDeviceManagement] = useState(false);

  // Load payment configuration on mount
  useEffect(() => {
    loadPaymentConfig();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (code && state) {
      handleOAuthCallback(code, state);
      // Clean URL
      window.history.replaceState({}, "", "/settings/integrations");
    }
  }, []);

  const loadPaymentConfig = async () => {
    setIsLoading(true);
    try {
      const config = await integrationService.getPaymentConfig();
      setPaymentConfig(config);
    } catch (error) {
      // No config exists yet, that's ok
      console.log("No payment configuration found");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    setIsConnecting(true);
    const toastId = toast.loading("Connecting to Square...");

    try {
      const config = await integrationService.handleOAuthCallback(code, state);
      setPaymentConfig(config);
      toast.success("Successfully connected to Square!", { id: toastId });
    } catch (error) {
      toast.error("Failed to connect to Square. Please try again.", { id: toastId });
      console.error("OAuth callback error:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectSquare = async () => {
    try {
      const { authorization_url } = await integrationService.getOAuthUrl("square" as PaymentProvider);
      // Redirect to Square OAuth
      window.location.href = authorization_url;
    } catch (error) {
      toast.error("Failed to initiate connection");
      console.error("OAuth initiation error:", error);
    }
  };

  const handleDisconnect = async () => {
    if (
      !window.confirm(
        "Are you sure you want to disconnect Square? This will also unpair all devices and disable payment processing."
      )
    ) {
      return;
    }

    setIsDisconnecting(true);
    try {
      await integrationService.disconnectPayment("square" as PaymentProvider);
      setPaymentConfig(null);
      toast.success("Successfully disconnected from Square");
    } catch (error) {
      toast.error("Failed to disconnect. Please try again.");
      console.error("Disconnect error:", error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isSquareConnected = paymentConfig?.provider === "square" && paymentConfig?.has_credentials;
  const merchantId = paymentConfig?.settings?.merchant_id;
  const connectedAt = paymentConfig?.created_at;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect Groomify with your favorite tools and services
        </p>
      </div>

      {/* Payment Processing Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Payment Processing
          </CardTitle>
          <CardDescription>
            Connect your payment terminal to process payments and accept tips
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Square Integration */}
            <div className="flex items-start justify-between p-4 border rounded-lg">
              <div className="flex gap-4">
                <div className="flex items-center">
                  {/* Square logo placeholder - using text for now */}
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    SQ
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Square</h3>
                    {isSquareConnected && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isSquareConnected
                      ? `Connected • Merchant ID: ${merchantId?.substring(0, 12)}...`
                      : "Accept payments with Square Terminal"}
                  </p>
                  {isSquareConnected && connectedAt && (
                    <p className="text-xs text-muted-foreground">
                      Connected on {formatDate(connectedAt)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isSquareConnected ? "default" : "outline"}>
                  {isSquareConnected ? "Connected" : "Not Connected"}
                </Badge>
                {isSquareConnected ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeviceManagement(true)}
                    >
                      Manage Devices
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDisconnect}
                      disabled={isDisconnecting || isLoading}
                    >
                      {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConnectSquare}
                    disabled={isConnecting || isLoading}
                  >
                    {isConnecting ? "Connecting..." : "Connect Square"}
                  </Button>
                )}
              </div>
            </div>

            {/* Clover - Coming Soon */}
            <div className="flex items-start justify-between p-4 border rounded-lg opacity-50">
              <div className="flex gap-4">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-sm">
                    CV
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">Clover</h3>
                  <p className="text-sm text-muted-foreground">
                    Accept payments with Clover terminals
                  </p>
                </div>
              </div>
              <Badge variant="outline">Coming Soon</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Marketing Section */}
      <Card>
        <CardHeader>
          <CardTitle>Email Marketing</CardTitle>
          <CardDescription>
            Sync customer data with email marketing platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
              <div className="space-y-1">
                <h3 className="font-semibold">Mailchimp</h3>
                <p className="text-sm text-muted-foreground">
                  Sync contacts with Mailchimp
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Coming Soon</Badge>
                <Button variant="outline" disabled>
                  Connect
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Management Dialog */}
      <DeviceManagement
        open={showDeviceManagement}
        onOpenChange={setShowDeviceManagement}
      />
    </div>
  );
}
