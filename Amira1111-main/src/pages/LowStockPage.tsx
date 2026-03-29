import { useInventoryStore } from '@/store/inventoryStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StockAdjustmentDialog } from '@/components/StockAdjustmentDialog';
import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function LowStockPage() {
  const { warehouses, getLowStockItems, isLoading } = useInventoryStore();
  const [selectedWh, setSelectedWh] = useState<string>('all');

  const lowStockData = useMemo(() => {
    let targetWarehouses = warehouses;
    if (selectedWh !== 'all') {
      targetWarehouses = warehouses.filter(w => w.id === selectedWh);
    }

    const data: any[] = [];
    targetWarehouses.forEach(w => {
      const items = getLowStockItems(w.id);
      items.forEach(itemRecord => {
        data.push({
          warehouseId: w.id,
          warehouseName: w.name,
          ...itemRecord
        });
      });
    });

    return data;
  }, [warehouses, selectedWh, getLowStockItems]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-8" dir="rtl">
      <div className="flex items-center gap-4 border-b pb-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/dashboard"><ArrowRight className="w-4 h-4" /></Link>
        </Button>
        <div className="bg-destructive/10 p-2 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-destructive">نواقص المخزون</h1>
          <p className="text-sm text-muted-foreground">قائمة بجميع الأصناف التي وصلت للحد الأدنى أو أقل</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>تصفية حسب المخزن</CardTitle>
          <div className="w-64">
            <Select value={selectedWh} onValueChange={setSelectedWh}>
              <SelectTrigger><SelectValue placeholder="اختر المخزن..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المخازن والعيادات</SelectItem>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-right font-bold">اسم الصنف</TableHead>
                  <TableHead className="text-center font-bold">الباركود</TableHead>
                  <TableHead className="text-center font-bold">الموقع</TableHead>
                  <TableHead className="text-center font-bold">الرصيد الحالي</TableHead>
                  <TableHead className="text-center font-bold">الحد الأدنى</TableHead>
                  <TableHead className="text-center font-bold w-32">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      لا توجد نواقص في المخزون حالياً! 🎉
                    </TableCell>
                  </TableRow>
                ) : (
                  lowStockData.map((record, index) => (
                    <TableRow key={`${record.warehouseId}-${record.itemId}-${index}`} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-bold">{record.item.name}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{record.item.id}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{record.warehouseName}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-destructive font-bold text-lg">
                        {record.quantity}
                      </TableCell>
                      <TableCell className="text-center">{record.item.minLimit}</TableCell>
                      <TableCell className="text-center">
                        <StockAdjustmentDialog itemId={record.item.id} itemName={record.item.name} />
                        <span className="text-xs text-muted-foreground block mt-1">تزويد</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
