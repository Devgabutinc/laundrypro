
import { Order, orderStatusClasses, orderStatusLabels } from "@/models/Order";

interface OrderStatusBadgeProps {
  status: Order["status"];
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <span className={`status-badge ${orderStatusClasses[status]}`}>
      {orderStatusLabels[status]}
    </span>
  );
}
