import { useState, useEffect } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PackagePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function StockAdjustmentDialog({ itemId, itemName }: { itemId: string, itemName: string }) {
  const { warehouses, getItemStock, addStock, dispenseItem } = useInventoryStore();
  const { toast } = useToast();
  const [warehouseId, setWarehouseId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Auto-set Main warehouse if user types a positive number (Addition)
  useEffect(() => {
    if (Number(quantity) > 0) {
      const mainWh = warehouses.find(w => w.type === 'main');
      if (mainWh && warehouseId !== mainWh.id) {
        setWarehouseId(mainWh.id);
      }
    }
  }, [quantity, warehouses, warehouseId]);

  const currentStock = warehouseId ? getItemStock(warehouseId, itemId) : 0;

  const handleAdjust = async () => {
    if (!warehouseId || !quantity) {
      toast({ title: 'خطأ', description: 'يرجى اختيار المخزن وتحديد الكمية', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const numQty = Number(quantity);
      if (numQty > 0) {
        await addStock(warehouseId, itemId, numQty, 'piece');
        toast({ title: 'تمت الإضافة', description: `تم إضافة ${numQty} قطعة لصنف ${itemName}` });
      } else if (numQty < 0) {
        const result = await dispenseItem(warehouseId, itemId, Math.abs(numQty), 'piece');
        if (result.success) {
          toast({ title: 'تم الصرف', description: `تم صرف ${Math.abs(numQty)} قطعة من صنف ${itemName}` });
        } else {
          throw new Error(result.message);
        }
      }
      setQuantity('');
      setNote('');
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" title="تعديل سريع للرصيد">
          <PackagePlus className="w-5 h-5 text-green-600 hover:text-green-700" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">تعديل رصيد: {itemName}</AlertDialogTitle>
          <AlertDialogDescription>
            يمكنك إضافة كمية (رقم موجب) أو صرف كمية (رقم سالب) من مخزن محدد.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>اختر العيادة / المخزن</Label>
            <Select
              value={warehouseId}
              onValueChange={setWarehouseId}
              disabled={Number(quantity) > 0} // Disable if adding, force to Main
            >
              <SelectTrigger><SelectValue placeholder="اختر المكان..." /></SelectTrigger>
              <SelectContent>
                {warehouses
                  .filter(w => Number(quantity) <= 0 || w.type === 'main')
                  .map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)
                }
              </SelectContent>
            </Select>
          </div>

          {warehouseId && (
            <div className="p-3 bg-muted/50 rounded-lg flex justify-between items-center border">
              <span className="text-sm font-medium">الرصيد الحالي في هذا الموقع:</span>
              <Badge variant="secondary" className="text-lg px-3">{currentStock} قطعة</Badge>
            </div>
          )}

          <div className="space-y-2">
            <Label>الكمية (مثال: 10 للإضافة، -5 للصرف)</Label>
            <Input
              type="number"
              placeholder="0"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="h-12 text-center text-xl font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label>ملاحظات (اختياري)</Label>
            <Input
              placeholder="سبب التعديل..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
        </div>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={() => { setWarehouseId(''); setQuantity(''); setNote(''); }}>إلغاء</AlertDialogCancel>
          <Button onClick={handleAdjust} disabled={loading || !warehouseId || !quantity}>
            {loading ? 'جاري الحفظ...' : 'تأكيد التعديل'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
