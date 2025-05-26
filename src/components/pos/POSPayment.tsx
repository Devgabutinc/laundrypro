import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CreditCard, Banknote, QrCode, ArrowLeft, Check } from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface POSPaymentProps {
  customerName: string;
  items: CartItem[];
  totalAmount: number;
  onBack: () => void;
  onComplete: (paymentData: any) => void;
  businessProfile?: any;
  isPendingOrder?: boolean;
}

export function POSPayment({ 
  customerName, 
  items, 
  totalAmount, 
  onBack, 
  onComplete, 
  businessProfile,
  isPendingOrder = false 
}: POSPaymentProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [amountReceived, setAmountReceived] = useState<number>(totalAmount);
  const [discount, setDiscount] = useState<number>(0);

  const totalAfterDiscount = Math.max(0, totalAmount - discount);

  const calculateChange = () => {
    if (paymentMethod !== "cash") return 0;
    return Math.max(0, amountReceived - totalAfterDiscount);
  };

  const change = calculateChange();
  const isPaymentValid =
    (paymentMethod === "cash" && amountReceived >= totalAfterDiscount) ||
    (paymentMethod && paymentMethod !== "cash");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{isPendingOrder ? 'Pembayaran Pesanan' : 'Pembayaran'}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Ringkasan Pesanan */}
        <div className="mb-4 p-4 rounded border bg-gray-50">
          <div className="font-bold text-base mb-2">Ringkasan Pesanan</div>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium">Pelanggan</p>
              <p className="text-base">{customerName}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Item</p>
              <ul className="mt-2 space-y-2">
                {items.map((item, index) => (
                  <li key={index} className="flex justify-between text-sm">
                    <span>{item.name} x{item.quantity}</span>
                    <span>Rp {(item.price * item.quantity).toLocaleString("id-ID")}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>Rp {totalAmount.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Diskon</span>
                <span>- Rp {discount.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between font-semibold mt-1 pt-1 border-t">
                <span>Total Bayar</span>
                <span>Rp {totalAfterDiscount.toLocaleString("id-ID")}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Form Pembayaran */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="discount">Diskon (Rp)</Label>
            <Input
              id="discount"
              type="number"
              min={0}
              max={totalAmount}
              value={discount}
              onChange={e => setDiscount(Math.max(0, Math.min(totalAmount, parseInt(e.target.value) || 0)))}
            />
          </div>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cash" id="payment-cash" />
              <Label htmlFor="payment-cash" className="flex items-center">
                <Banknote className="mr-2 h-4 w-4" /> Tunai
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="transfer" id="payment-transfer" />
              <Label htmlFor="payment-transfer" className="flex items-center">
                <CreditCard className="mr-2 h-4 w-4" /> Transfer Bank
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="qris" id="payment-qris" />
              <Label htmlFor="payment-qris" className="flex items-center">
                <QrCode className="mr-2 h-4 w-4" /> QRIS
              </Label>
            </div>
          </RadioGroup>

          {paymentMethod === "cash" && (
            <div className="space-y-2">
              <Label htmlFor="amount-received">Uang Diterima</Label>
              <Input
                id="amount-received"
                type="number"
                min={totalAfterDiscount}
                value={amountReceived}
                onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
              />
              <div className="pt-2">
                <div className="flex justify-between text-sm">
                  <span>Total Belanja</span>
                  <span>Rp {totalAfterDiscount.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Uang Diterima</span>
                  <span>Rp {amountReceived.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between font-medium mt-1 pt-1 border-t">
                  <span>Kembalian</span>
                  <span>Rp {change.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>
          )}

          {paymentMethod === "transfer" && businessProfile && (
            <div className="space-y-2">
              <Label>Transfer ke Bank</Label>
              <div className="border rounded p-3 bg-muted">
                <div><b>Bank:</b> {businessProfile.bank_name || '-'}</div>
                <div><b>Nama Pemilik:</b> {businessProfile.bank_account_name || '-'}</div>
                <div><b>No. Rekening:</b> {businessProfile.bank_account_number || '-'}</div>
              </div>
            </div>
          )}

          {paymentMethod === "qris" && businessProfile && (
            <div className="space-y-2">
              <Label>Scan QRIS</Label>
              {businessProfile.qris_url ? (
                <img src={businessProfile.qris_url} alt="QRIS" className="h-32 rounded border mx-auto" />
              ) : (
                <div className="text-muted-foreground">QRIS belum diatur di profil bisnis</div>
              )}
            </div>
          )}

          <Button 
            className="w-full" 
            size="lg"
            disabled={!isPaymentValid}
            onClick={() => {
              onComplete({
                method: paymentMethod,
                discount,
                amountReceived,
                change
              });
            }}
          >
            {isPendingOrder ? 'Selesaikan Pembayaran' : 'Bayar Sekarang'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
