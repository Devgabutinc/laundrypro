
import { useState } from "react";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Product } from "@/models/Product";

interface InventoryFormProps {
  onSubmit: (data: Omit<Product, "id" | "created_at" | "updated_at">) => void;
  product?: Product;
}

export function InventoryForm({ onSubmit, product }: InventoryFormProps) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price !== undefined ? String(product.price) : "",
    category: product?.category || "",
    stock_quantity: product?.stock_quantity !== undefined ? String(product.stock_quantity) : "",
    unit: product?.unit || "pcs"
  });

  const categories = ["cleaning", "equipment", "packaging", "chemical", "other"];
  const units = ["pcs", "kg", "liter", "roll", "box", "pack"];

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{product ? "Edit Produk" : "Tambah Produk Baru"}</DialogTitle>
        <DialogDescription>
          {product 
            ? "Edit detail produk dan klik simpan ketika selesai."
            : "Masukkan detail produk dan klik simpan ketika selesai."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nama Produk</Label>
          <Input
            id="name"
            required
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Masukkan nama produk"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Deskripsi</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Deskripsi produk (opsional)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Harga (Rp)</Label>
            <Input
              id="price"
              type="text"
              required
              value={formData.price}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                handleChange("price", value);
              }}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Kategori</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => handleChange("category", value)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category} className="capitalize">
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="stock_quantity">Jumlah Stok</Label>
            <Input
              id="stock"
              type="text"
              required
              value={formData.stock_quantity}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                handleChange("stock_quantity", value);
              }}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="unit">Satuan</Label>
            <Select 
              value={formData.unit} 
              onValueChange={(value) => handleChange("unit", value)}
            >
              <SelectTrigger id="unit">
                <SelectValue placeholder="Pilih satuan" />
              </SelectTrigger>
              <SelectContent>
                {units.map(unit => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit">
          {product ? "Simpan Perubahan" : "Tambah Produk"}
        </Button>
      </DialogFooter>
    </form>
  );
}
