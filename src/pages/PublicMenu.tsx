import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { usePublicOutlet, usePublicMenu } from '@/hooks/useData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShoppingBag, Search, X } from 'lucide-react';
import MenuHeader from '@/components/public-menu/MenuHeader';
import MenuItemCard from '@/components/public-menu/MenuItemCard';
import CartSheet, { type CartItem } from '@/components/public-menu/CartSheet';
import OrderTracking from '@/components/public-menu/OrderTracking';

export default function PublicMenu() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('table');
  const { data: outlet, isLoading } = usePublicOutlet(slug || '');
  const { data: menu } = usePublicMenu(outlet?.id);
  const [tableNumber, setTableNumber] = useState<string | null>(null);

  // Fetch table number if dine-in
  useEffect(() => {
    if (!tableId) return;
    supabase.from('tables').select('table_number').eq('id', tableId).single().then(({ data }) => {
      if (data) setTableNumber(data.table_number);
    });
  }, [tableId]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [locationLink, setLocationLink] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const storageKey = `order-ids-${slug || ''}${tableId ? `-${tableId}` : ''}`;
  const [orderIds, setOrderIds] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showTracking, setShowTracking] = useState(false);

  useEffect(() => {
    if (orderIds.length > 0) {
      sessionStorage.setItem(storageKey, JSON.stringify(orderIds));
    }
  }, [orderIds, storageKey]);

  useEffect(() => {
    if (orderIds.length === 0) return;
    const completedStatuses = ['closed', 'delivered', 'picked_up'];
    supabase.from('orders').select('id, status').in('id', orderIds).then(({ data }) => {
      if (!data) return;
      const activeOrders = data.filter(o => !completedStatuses.includes(o.status));
      if (activeOrders.length > 0) {
        setShowTracking(true);
      } else {
        setOrderIds([]);
        sessionStorage.removeItem(storageKey);
        setShowTracking(false);
      }
    });
  }, []);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const categoryRef = useRef<HTMLDivElement>(null);

  // Get outlet settings for ordering modes
  const outletSettings = (outlet as any)?.outlet_settings?.[0] || (outlet as any)?.outlet_settings || null;
  const deliveryEnabled = outletSettings?.enable_delivery ?? true;
  const takeawayEnabled = outletSettings?.enable_takeaway ?? true;
  const outletDeliveryCharges = Number(outletSettings?.delivery_charge) || 0;

  const [selectedOrderType, setSelectedOrderType] = useState<'delivery' | 'takeaway' | null>(null);

  // Auto-select if only one option available
  useEffect(() => {
    if (tableId) return; // dine-in
    if (deliveryEnabled && !takeawayEnabled) setSelectedOrderType('delivery');
    else if (!deliveryEnabled && takeawayEnabled) setSelectedOrderType('takeaway');
  }, [deliveryEnabled, takeawayEnabled, tableId]);

  const orderType: 'dine_in' | 'takeaway' | 'delivery' = tableId ? 'dine_in' : (selectedOrderType || 'delivery');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [pickupTime, setPickupTime] = useState('');

  useEffect(() => {
    if (menu?.categories?.[0] && !activeCategory) setActiveCategory(menu.categories[0].id);
  }, [menu]);

  const addToCart = (item: { id: string; name: string; price: number; discounted_price?: number | null; image_url?: string | null }) => {
    const price = item.discounted_price || item.price;
    setCart(c => {
      const existing = c.find(i => i.id === item.id);
      if (existing) return c.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...c, { id: item.id, name: item.name, price, quantity: 1, image_url: item.image_url }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(c => c.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  // Calculate charges based on order type
  // IMPORTANT: Delivery charge applies ONLY ONCE per active session.
  // If customer already has an active delivery order in this session, additional
  // orders in the same delivery flow do NOT add another delivery fee.
  const isAdditionalDeliveryInSession = orderType === 'delivery' && orderIds.length > 0;
  const deliveryChargesForOrder = orderType === 'delivery' && !isAdditionalDeliveryInSession ? outletDeliveryCharges : 0;
  const taxPercentage = Number(outletSettings?.tax_rate) || 0;
  const serviceChargePercentage = Number(outletSettings?.service_charge_rate) || 0;
  const taxAmount = orderType === 'dine_in' ? (cartTotal * taxPercentage / 100) : 0;
  const serviceChargeAmount = orderType === 'dine_in' ? (cartTotal * serviceChargePercentage / 100) : 0;
  const grandTotal = cartTotal + deliveryChargesForOrder + taxAmount + serviceChargeAmount;

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      const { data: order, error } = await supabase.from('orders').insert({
        outlet_id: outlet!.id,
        table_id: tableId || null,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        customer_address: customerAddress || null,
        location_link: locationLink || null,
        special_instructions: orderNotes || null,
        order_type: orderType,
        subtotal: cartTotal,
        tax_amount: Math.round(taxAmount),
        service_charge: Math.round(serviceChargeAmount),
        delivery_charge: deliveryChargesForOrder,
        total: Math.round(grandTotal),
        status: 'pending',
        payment_status: 'unpaid',
        vehicle_number: vehicleNumber || null,
        pickup_time: pickupTime || null,
      } as any).select().single();
      if (error) throw error;

      const items = cart.map(i => ({
        order_id: order.id, menu_item_id: i.id, name: i.name,
        quantity: i.quantity, price: i.price,
      }));
      await supabase.from('order_items').insert(items);

      setOrderIds(prev => [...prev, order.id]);
      setShowTracking(true);
      setCart([]);
      setShowCart(false);
      setOrderNotes('');
      toast.success(orderIds.length > 0 ? 'Additional order placed!' : 'Order placed successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order');
    }
    setPlacing(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-sm text-muted-foreground">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (!outlet) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center">
          <p className="text-5xl mb-3">🍽️</p>
          <p className="font-heading text-lg font-bold text-foreground">Menu not found</p>
          <p className="text-sm text-muted-foreground mt-1">This restaurant menu is unavailable.</p>
        </div>
      </div>
    );
  }

  if (showTracking && orderIds.length > 0) {
    const settings = Array.isArray(outlet.outlet_settings) ? outlet.outlet_settings[0] : outlet.outlet_settings || null;
    return (
      <OrderTracking
        orderIds={orderIds}
        outletName={outlet.name}
        orderType={orderType}
        outletSettings={settings}
        paymentInfo={{
          bank_name: settings?.bank_name || null,
          bank_account_title: settings?.bank_account_title || null,
          bank_account_number: settings?.bank_account_number || null,
          bank_iban: settings?.bank_iban || null,
          jazzcash_title: settings?.jazzcash_title || null,
          jazzcash_number: settings?.jazzcash_number || null,
          easypaisa_title: settings?.easypaisa_title || null,
          easypaisa_number: settings?.easypaisa_number || null,
        }}
        outletId={outlet.id}
        onOrderMore={() => setShowTracking(false)}
        outletInfo={{ name: outlet.name, address: outlet.address, phone: outlet.phone, city: outlet.city }}
        tableNumber={tableNumber}
        onAllClosed={() => {
          setOrderIds([]);
          sessionStorage.removeItem(storageKey);
          setShowTracking(false);
        }}
      />
    );
  }

  let displayItems = menu?.items || [];
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    displayItems = displayItems.filter(i => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q));
  } else {
    displayItems = displayItems.filter(i => i.category_id === activeCategory);
  }

  const activeCatName = menu?.categories.find(c => c.id === activeCategory)?.name;

  return (
    <div className="min-h-screen bg-background pb-28 max-w-lg mx-auto relative">
      <MenuHeader outlet={outlet} />

      {orderIds.length > 0 && (
        <div className="mx-4 mt-3">
          <button
            onClick={() => setShowTracking(true)}
            className="w-full px-4 py-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between"
          >
            <span className="text-sm font-semibold text-primary">
              📋 You have {orderIds.length} active order{orderIds.length > 1 ? 's' : ''}
            </span>
            <span className="text-xs text-primary font-medium">View Status →</span>
          </button>
        </div>
      )}

      {/* Order Type Selection */}
      <div className="mx-4 mt-4">
        {tableId ? (
          <div className="px-4 py-2.5 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center gap-2">
            <span className="text-sm">🍽️</span>
            <p className="text-xs font-semibold text-primary">Dine-in Order</p>
          </div>
        ) : (deliveryEnabled || takeawayEnabled) ? (
          <div className="grid grid-cols-2 gap-3">
            {deliveryEnabled && (
              <button
                onClick={() => setSelectedOrderType('delivery')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  selectedOrderType === 'delivery'
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <span className="text-2xl">🛵</span>
                <span className="text-sm font-bold text-foreground">Delivery</span>
                <span className="text-[10px] text-muted-foreground">We deliver to you</span>
                {outletDeliveryCharges > 0 && (
                  <span className="text-[10px] text-muted-foreground">+Rs.{outletDeliveryCharges}</span>
                )}
              </button>
            )}
            {takeawayEnabled && (
              <button
                onClick={() => setSelectedOrderType('takeaway')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  selectedOrderType === 'takeaway'
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <span className="text-2xl">🛍️</span>
                <span className="text-sm font-bold text-foreground">Takeaway</span>
                <span className="text-[10px] text-muted-foreground">Pick up yourself</span>
              </button>
            )}
          </div>
        ) : (
          <div className="px-4 py-4 rounded-2xl bg-muted border border-border text-center">
            <p className="text-sm font-semibold text-foreground">Online ordering not available</p>
            <p className="text-xs text-muted-foreground mt-1">Please visit the restaurant or scan a table QR code</p>
          </div>
        )}
      </div>

      {/* Sticky Search + Categories */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md mt-3 border-b">
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-9 rounded-xl bg-muted/60 border-0 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
        {!searchQuery && (
          <div ref={categoryRef} className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {menu?.categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                  activeCategory === cat.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div className="p-4 space-y-3">
        {!searchQuery && activeCatName && (
          <h2 className="font-heading font-bold text-base text-foreground">{activeCatName}</h2>
        )}
        {searchQuery && (
          <p className="text-xs text-muted-foreground mb-1">
            {displayItems.length} result{displayItems.length !== 1 ? 's' : ''} for "{searchQuery}"
          </p>
        )}
        {displayItems.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm font-medium text-foreground">{searchQuery ? 'No items found' : 'No items yet'}</p>
            <p className="text-xs text-muted-foreground mt-1">{searchQuery ? 'Try a different search' : 'Check back soon!'}</p>
          </div>
        )}
        {displayItems.map(item => {
          const inCart = cart.find(c => c.id === item.id);
          return (
            <MenuItemCard
              key={item.id} item={item} quantity={inCart?.quantity || 0}
              onAdd={() => addToCart(item)} onIncrement={() => updateQty(item.id, 1)} onDecrement={() => updateQty(item.id, -1)}
            />
          );
        })}
      </div>

      {/* Floating Cart Button */}
      {cartCount > 0 && !showCart && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-20 pointer-events-none">
          <div className="max-w-lg mx-auto pointer-events-auto">
            <button
              onClick={() => setShowCart(true)}
              className="w-full flex items-center justify-between bg-primary text-primary-foreground rounded-2xl px-5 py-4 shadow-xl active:scale-[0.98] transition-transform"
            >
              <span className="flex items-center gap-2.5 font-semibold">
                <div className="relative">
                  <ShoppingBag className="h-5 w-5" />
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold flex items-center justify-center">
                    {cartCount}
                  </span>
                </div>
                {orderIds.length > 0 ? 'Add to Order' : 'View Cart'}
              </span>
              <span className="font-heading font-extrabold text-lg">Rs.{Math.round(grandTotal).toLocaleString()}</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart Sheet */}
      {showCart && (
        <CartSheet
          cart={cart} orderType={orderType}
          customerName={customerName} customerPhone={customerPhone}
          customerAddress={customerAddress} locationLink={locationLink}
          orderNotes={orderNotes} placing={placing}
          vehicleNumber={vehicleNumber} pickupTime={pickupTime}
          deliveryCharges={deliveryChargesForOrder}
          taxAmount={taxAmount}
          serviceChargeAmount={serviceChargeAmount}
          taxPercentage={taxPercentage}
          serviceChargePercentage={serviceChargePercentage}
          onClose={() => setShowCart(false)} onUpdateQty={updateQty}
          onSetName={setCustomerName} onSetPhone={setCustomerPhone}
          onSetAddress={setCustomerAddress} onSetLocationLink={setLocationLink}
          onSetNotes={setOrderNotes} onPlaceOrder={placeOrder}
          onSetVehicleNumber={setVehicleNumber} onSetPickupTime={setPickupTime}
          isAdditionalOrder={orderIds.length > 0}
        />
      )}
    </div>
  );
}
