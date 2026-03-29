import { useState, useMemo, useEffect } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Search, Barcode as BarcodeIcon, RotateCcw, PackagePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Item } from '@/types/inventory';
import { matchItem } from '@/lib/searchUtils';

import { StockAdjustmentDialog } from '@/components/StockAdjustmentDialog';

export default function ItemsPage() {
  const { items, addItem, updateItem, deleteItem, inventory, warehouses, isLoading } = useInventoryStore();
  const { toast } = useToast();

  const [editId, setEditId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    id: '',
    name: '',
    unitType: 'قطعة',
    conversionFactor: '1',
    cartonSize: '',
    bagSize: '',
    purchasePrice: '',
    salePrice: '',
    vat: '0',
    minLimit: '5'
  });

  const resetForm = () => {
    setForm({
      id: '',
      name: '',
      unitType: 'قطعة',
      conversionFactor: '1',
      cartonSize: '',
      bagSize: '',
      purchasePrice: '',
      salePrice: '',
      vat: '0',
      minLimit: '5'
    });
    setEditId(null);
  };

  // فلترة الأصناف بناءً على البحث
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // إذا كان هناك بحث بالباركود، نفلتر به أولاً (أو نضمنه)
      if (barcodeSearch && !item.id.toLowerCase().includes(barcodeSearch.toLowerCase())) {
        return false;
      }
      // البحث الذكي في الاسم والباركود باستخدام searchTerm
      return matchItem(item, searchTerm);
    });
  }, [items, searchTerm, barcodeSearch]);

  const openEdit = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    setEditId(id);
    setForm({
      id: item.id,
      name: item.name,
      unitType: item.unitType,
      conversionFactor: String(item.conversionFactor),
      cartonSize: String(item.cartonSize || ''),
      bagSize: String(item.bagSize || ''),
      purchasePrice: String(item.purchasePrice),
      salePrice: String(item.salePrice),
      vat: String(item.vat),
      minLimit: String(item.minLimit),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!form.id || !form.name || !form.purchasePrice || !form.salePrice) {
      toast({ title: 'خطأ في البيانات', description: 'يرجى ملء الباركود، الاسم، والأسعار', variant: 'destructive' });
      return;
    }

    const data: Item = {
      id: form.id,
      name: form.name,
      unitType: form.unitType,
      conversionFactor: Number(form.conversionFactor) || 1,
      cartonSize: Number(form.cartonSize) || 0,
      bagSize: Number(form.bagSize) || 0,
      purchasePrice: Number(form.purchasePrice),
      salePrice: Number(form.salePrice),
      vat: Number(form.vat) || 0,
      minLimit: Number(form.minLimit) || 0,
    };

    setSubmitting(true);
    try {
      if (editId) {
        await updateItem(editId, data);
        toast({ title: 'تم التحديث', description: `تم تحديث صنف "${form.name}" بنجاح` });
      } else {
        // Check if barcode already exists
        if (items.some(i => i.id === data.id)) {
          throw new Error('هذا الباركود مسجل مسبقاً لصنف آخر');
        }
        await addItem(data);
        toast({ title: 'تمت الإضافة', description: `تم إضافة صنف "${form.name}" بنجاح` });
      }
      resetForm();
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem(id);
      toast({ title: 'تم الحذف', description: 'تم حذف الصنف بنجاح' });
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    }
  };

  const getTotalStock = (itemId: string) =>
    inventory.filter(r => r.itemId === itemId).reduce((s, r) => s + r.quantity, 0);

  const getWarehouseStock = (itemId: string) => {
    // Ensure we always have Main Warehouse and Clinics 1-5 in order
    const orderedWarehouses = [
      ...warehouses.filter(w => w.type === 'main'),
      ...warehouses.filter(w => w.type === 'clinic').sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    ];

    return orderedWarehouses.map(w => ({
      name: w.name,
      quantity: inventory.find(r => r.itemId === itemId && r.warehouseId === w.id)?.quantity || 0,
      isMain: w.type === 'main'
    }));
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in" dir="rtl">
      {/* إدارة الأصناف - العنوان */}
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="bg-primary/10 p-2 rounded-lg">
          <BarcodeIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">الأصناف</h1>
          <p className="text-sm text-muted-foreground">إضافة وتعديل بيانات الأصناف والمخزون</p>
        </div>
      </div>

      {/* نموذج الإدخال */}
      <Card className="border-2 border-primary/10 shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-sm font-bold">الباركود 2</Label>
              <Input
                placeholder="أدخل رقم الباركود"
                value={form.id}
                onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
                disabled={!!editId}
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-bold">الاسم</Label>
              <Input
                placeholder="اسم الصنف"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold">سعر الشراء</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.purchasePrice}
                onChange={e => setForm(f => ({ ...f, purchasePrice: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold">سعر البيع</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.salePrice}
                onChange={e => setForm(f => ({ ...f, salePrice: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold">القطع في الكرتونة</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.cartonSize}
                onChange={e => setForm(f => ({ ...f, cartonSize: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold">القطع في الكيس</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.bagSize}
                onChange={e => setForm(f => ({ ...f, bagSize: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold">رصيد أول المدة</Label>
              <Input
                type="number"
                placeholder="0"
                className="bg-yellow-50/30 border-yellow-200"
                disabled={!!editId}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold">الحد الأدنى</Label>
              <Input
                type="number"
                value={form.minLimit}
                onChange={e => setForm(f => ({ ...f, minLimit: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold">نسبة القيمة المضافة %</Label>
              <Input
                type="number"
                value={form.vat}
                onChange={e => setForm(f => ({ ...f, vat: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            <Button className="gap-2 bg-primary hover:bg-primary/90 min-w-[100px]" onClick={handleSave} disabled={submitting}>
              إضافة
            </Button>
            <Button variant="outline" className="gap-2 min-w-[100px]" onClick={handleSave} disabled={!editId || submitting}>
              تعديل
            </Button>
            <Button variant="outline" className="gap-2 min-w-[100px]" onClick={() => { setSearchTerm(form.name); setBarcodeSearch(form.id); }}>
              بحث
            </Button>
            <Button variant="outline" className="gap-2 min-w-[100px]" onClick={() => window.print()}>
              تحميل
            </Button>
            <Button variant="outline" className="gap-2 min-w-[100px]" onClick={() => { setSearchTerm(form.name); setBarcodeSearch(form.id); }}>
              بحث بالباركود
            </Button>
            <Button variant="secondary" className="gap-2 min-w-[100px]" onClick={resetForm}>
              رجوع
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* شريط البحث والمرشحات */}
      <div className="flex gap-4 items-center bg-muted/30 p-4 rounded-lg border">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن صنف بالاسم..."
            className="pr-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative w-48">
          <BarcodeIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="باركود..."
            className="pr-10"
            value={barcodeSearch}
            onChange={e => setBarcodeSearch(e.target.value)}
          />
        </div>
      </div>

      {/* جدول البيانات */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-right font-bold w-16">م</TableHead>
                <TableHead className="text-right font-bold">اسم الصنف</TableHead>
                <TableHead className="text-center font-bold">الرصيد</TableHead>
                <TableHead className="text-center font-bold">سعر الشراء</TableHead>
                <TableHead className="text-center font-bold">سعر البيع</TableHead>
                <TableHead className="text-center font-bold">الحد الأدنى</TableHead>
                <TableHead className="text-center font-bold">الباركود</TableHead>
                <TableHead className="text-left font-bold w-24">ملاحظات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item, index) => {
                const total = getTotalStock(item.id);
                const isLowStock = total <= item.minLimit;
                return (
                  <TableRow key={item.id} className="hover:bg-muted/50 transition-colors border-b">
                    <TableCell className="font-mono text-sm">{index + 1}</TableCell>
                    <TableCell className="font-bold">{item.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start min-w-[140px] text-xs">
                        <div className="flex justify-between w-full border-b border-primary/20 pb-1 mb-1 bg-primary/5 px-2 py-1 rounded">
                          <span className="font-bold text-primary">الإجمالي:</span>
                          <Badge variant={isLowStock ? "destructive" : "secondary"} className="font-bold h-5 px-1.5">{total}</Badge>
                        </div>
                        <div className="grid grid-cols-1 gap-0.5 w-full px-1">
                          {getWarehouseStock(item.id).map(ws => (
                            <div key={ws.name} className={`flex justify-between items-center w-full py-0.5 ${ws.isMain ? "font-bold border-b border-dashed mb-1" : "text-muted-foreground"}`}>
                              <span>{ws.name}:</span>
                              <span className={`font-mono ${ws.quantity > 0 ? "text-foreground" : "text-muted-foreground/50"}`}>{ws.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">{item.purchasePrice.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-medium">{item.salePrice.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{item.minLimit}</TableCell>
                    <TableCell className="text-center font-mono text-sm">{item.id}</TableCell>
                    <TableCell>
                      <div className="flex justify-start gap-1">
                        <StockAdjustmentDialog itemId={item.id} itemName={item.name} />

                        <Button variant="ghost" size="icon" onClick={() => openEdit(item.id)}>
                          <Pencil className="w-4 h-4 text-blue-600" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                سيتم حذف الصنف "{item.name}" نهائياً من النظام. لا يمكن التراجع عن هذا الإجراء.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                تأكيد الحذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    {searchTerm || barcodeSearch ? 'لا توجد نتائج تطابق بحثك.' : 'لا توجد أصناف في المخزن حالياً.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
