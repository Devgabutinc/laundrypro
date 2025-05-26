import { Order, getNextOrderStatus, orderStatusLabels } from "@/models/Order";
import { getShortOrderId } from "@/lib/utils";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useContext } from "react";
import { TenantContext } from "@/contexts/TenantContext";
import { generateWhatsAppMessage, getWhatsAppDeepLink } from "@/services/NotificationService";

interface OrderCardProps {
  order: Order;
  onUpdateStatus?: (orderId: string, newStatus: Order["status"]) => void;
}

export function OrderCard({ order, onUpdateStatus }: OrderCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { tenant } = useContext(TenantContext);
 
  
  // Function to format date
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "-";
    
    // Check if date is valid before formatting
    try {
      // Ensure it's a valid Date object
      const validDate = new Date(date);
      if (isNaN(validDate.getTime())) {
        return "-";
      }
      
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(validDate);
    } catch (error) {
    
      return "-";
    }
  };

  // Function to handle status update
  const handleUpdateStatus = () => {
    const nextStatus = getNextOrderStatus(order.status);
    if (nextStatus && onUpdateStatus) {
      setIsUpdating(true);
      // In a real app, we would make an API call here
      setTimeout(() => {
        onUpdateStatus(order.id, nextStatus);
        setIsUpdating(false);
      }, 500);
    }
  };

  // Function to handle WhatsApp notification
  const handleSendWhatsApp = () => {
    const message = generateWhatsAppMessage(order, tenant?.whatsappNumber);
    const whatsAppLink = getWhatsAppDeepLink(message);
    window.open(whatsAppLink, "_blank");
  };

  // Safely format price
  const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null) return "Rp 0";
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  return (
    <Card className="animate-list-item">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">Pesanan {getShortOrderId(order.id)}</CardTitle>
          <div className="flex flex-row gap-2 items-center">
            <OrderStatusBadge status={order.status} />
            {order.payment_status === 'unpaid' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-black">Menunggu Pembayaran</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Pelanggan</p>
            <p className="text-base">{order.customerName}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Total Biaya</p>
            <p className="text-base">{formatPrice(order.totalPrice)}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Tanggal Pesanan</p>
            <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Status Terakhir</p>
            <p className="text-sm text-muted-foreground">{formatDate(order.updatedAt)}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full sm:w-auto"
          onClick={handleSendWhatsApp}
        >
          Kirim Notifikasi
        </Button>
        {getNextOrderStatus(order.status) && (
          <Button 
            className="w-full sm:w-auto"
            size="sm"
            onClick={handleUpdateStatus}
            disabled={isUpdating}
          >
            {isUpdating ? "Memproses..." : `Update ke ${orderStatusLabels[getNextOrderStatus(order.status)!]}`}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
