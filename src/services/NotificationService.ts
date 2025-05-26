
import { Order } from "@/models/Order";

// Function to generate a WhatsApp message for an order
export function generateWhatsAppMessage(order: Order, tenantWhatsAppNumber?: string): string {
  const statusMessages = {
    received: "telah diterima dan sedang diproses",
    washing: "sedang dicuci",
    ironing: "sedang disetrika",
    ready: "siap untuk diambil",
    completed: "telah selesai dan sudah diambil"
  };

  const message = `Hai ${order.customerName}, 
Pesanan laundry Anda dengan nomor #${order.id} sekarang ${statusMessages[order.status]}.
Terima kasih!`;

  // Only include the click to respond link if we have a WhatsApp number
  const whatsAppNumber = tenantWhatsAppNumber || "";
  if (whatsAppNumber) {
    return encodeURIComponent(message) + `&phone=${whatsAppNumber}`;
  }
  
  return encodeURIComponent(message);
}

// Function to get a WhatsApp deep link
export function getWhatsAppDeepLink(message: string, phoneNumber?: string): string {
  const baseUrl = "https://wa.me/";
  
  if (phoneNumber) {
    return `${baseUrl}${phoneNumber}?text=${message}`;
  }
  
  return `${baseUrl}?text=${message}`;
}
