import { useState } from 'react';
import { useOutlet, useMenuCategories, useMenuItems, useCreateCategory, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem, useDeleteCategory } from '@/hooks/useData';
import { useResolvedSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, FolderPlus, AlertTriangle, ImageIcon } from 'lucide-react';
import { MenuItemImageUpload } from '@/components/menu/MenuItemImageUpload';

export default function MenuManagement() {
  const { data: outlet } = useOutlet();
  const { data: categories } = useMenuCategories(outlet?.id);
  const { data: items } = useMenuItems(outlet?.id);
  const { data: sub } = useResolvedSubscription(outlet?.id);
  const createCategory = useCreateCategory();
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();
  const deleteCategory = useDeleteCategory();

  const [catName, setCatName] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState({ name: '', price: '', description: '', category_id: '', discounted_price: '', tags: [] as string[], image_url: '' });

  const itemLimit = sub?.limits?.maxMenuItems ?? 0; // 0 = unlimited
  const currentCount = items?.length ?? 0;
  const canAddItem = !sub?.canAccessApp ? false : (itemLimit === 0 || currentCount < itemLimit);
  const isLocked = !sub?.canAccessApp;

  if (!outlet) return <p className="text-muted-foreground">Please set up your outlet first.</p>;

  const handleAddCategory = async () => {
    if (!catName.trim()) return;
    try {
      await createCategory.mutateAsync({ name: catName, outlet_id: outlet.id, sort_order: (categories?.length ?? 0) });
      setCatName('');
      toast.success('Category added!');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddItem) return toast.error(itemLimit > 0 ? `Plan limit reached (${itemLimit} items). Upgrade to add more.` : 'Your plan does not allow adding items right now.');
    try {
      await createItem.mutateAsync({
        name: itemForm.name,
        price: Number(itemForm.price),
        description: itemForm.description || undefined,
        category_id: itemForm.category_id,
        outlet_id: outlet.id,
        discounted_price: itemForm.discounted_price ? Number(itemForm.discounted_price) : undefined,
        tags: itemForm.tags,
        image_url: itemForm.image_url || undefined,
      });
      setItemForm({ name: '', price: '', description: '', category_id: '', discounted_price: '', tags: [], image_url: '' });
      setShowAddItem(false);
      toast.success('Item added!');
    } catch (err: any) { toast.error(err.message); }
  };

  const toggleTag = (tag: string) => {
    setItemForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Menu</h1>
          <p className="text-muted-foreground">{currentCount} items{itemLimit > 0 ? `/${itemLimit}` : ''} · {categories?.length ?? 0} categories</p>
        </div>
      </div>

      {isLocked && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">Demo expired. Menu is read-only. Upgrade to edit.</p>
          </CardContent>
        </Card>
      )}

      {/* Add Category */}
      {!isLocked && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-heading">Categories</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input placeholder="e.g. Breakfast, Deals, Drinks" value={catName} onChange={e => setCatName(e.target.value)} />
              <Button onClick={handleAddCategory} disabled={createCategory.isPending}><FolderPlus className="h-4 w-4 mr-1" /> Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {categories?.map(c => (
                <Badge key={c.id} variant="secondary" className="gap-1 text-sm py-1 px-3">
                  {c.name}
                  <button onClick={() => { deleteCategory.mutate(c.id); toast.success('Deleted'); }} className="ml-1 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Item */}
      {!isLocked && (
        <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
          <DialogTrigger asChild>
            <Button variant="hero" disabled={!canAddItem}><Plus className="h-4 w-4 mr-1" /> Add Menu Item</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-heading">Add Menu Item</DialogTitle></DialogHeader>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="space-y-2">
                <Label>Item Name *</Label>
                <Input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={itemForm.category_id} onValueChange={v => setItemForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Price (PKR) *</Label>
                  <Input type="number" value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))} required min="0" />
                </div>
                <div className="space-y-2">
                  <Label>Sale Price</Label>
                  <Input type="number" value={itemForm.discounted_price} onChange={e => setItemForm(f => ({ ...f, discounted_price: e.target.value }))} min="0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Item Image</Label>
                <MenuItemImageUpload
                  value={itemForm.image_url || undefined}
                  onChange={url => setItemForm(f => ({ ...f, image_url: url || '' }))}
                  outletId={outlet.id}
                />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  {['popular', 'spicy', 'new'].map(tag => (
                    <Badge key={tag} variant={itemForm.tags.includes(tag) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleTag(tag)}>{tag}</Badge>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" variant="hero" disabled={createItem.isPending}>
                {createItem.isPending ? 'Adding...' : 'Add Item'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Items List */}
      <div className="space-y-3">
        {categories?.map(cat => {
          const catItems = items?.filter(i => i.category_id === cat.id) || [];
          if (catItems.length === 0) return null;
          return (
            <div key={cat.id}>
              <h3 className="font-heading font-semibold text-foreground mb-2">{cat.name}</h3>
              <div className="space-y-2">
                {catItems.map(item => (
                  <Card key={item.id} className="shadow-card">
                    <CardContent className="flex items-center gap-4 py-3">
                      <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">{item.name}</p>
                          {item.tags?.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                        </div>
                        {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        {item.discounted_price ? (
                          <div>
                            <span className="line-through text-xs text-muted-foreground">Rs. {item.price}</span>
                            <p className="font-semibold text-foreground">Rs. {item.discounted_price}</p>
                          </div>
                        ) : (
                          <p className="font-semibold text-foreground">Rs. {item.price}</p>
                        )}
                      </div>
                      {!isLocked && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Switch checked={item.is_available ?? true} onCheckedChange={v => updateItem.mutate({ id: item.id, is_available: v })} />
                          <button onClick={() => { deleteItem.mutate(item.id); toast.success('Deleted'); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
