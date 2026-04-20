import { X, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
}

interface CartSheetProps {
  cart: CartItem[];
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  locationLink: string;
  orderNotes: string;
  vehicleNumber: string;
  pickupTime: string;
  placing: boolean;
  deliveryCharges?: number;
  taxAmount?: number;
  serviceChargeAmount?: number;
  taxPercentage?: number;
  serviceChargePercentage?: number;
  onClose: () => void;
  onUpdateQty: (id: string, delta: number) => void;
  onSetName: (v: string) => void;
  onSetPhone: (v: string) => void;
  onSetAddress: (v: string) => void;
  onSetLocationLink: (v: string) => void;
  onSetNotes: (v: string) => void;
  onSetVehicleNumber: (v: string) => void;
  onSetPickupTime: (v: string) => void;
  onPlaceOrder: () => void;
  isAdditionalOrder?: boolean;
}

export default function CartSheet({
  cart, orderType, customerName, customerPhone, customerAddress, locationLink, orderNotes,
  vehicleNumber, pickupTime, deliveryCharges = 0, taxAmount = 0, serviceChargeAmount = 0,
  taxPercentage = 0, serviceChargePercentage = 0,
  placing, onClose, onUpdateQty, onSetName, onSetPhone, onSetAddress, onSetLocationLink, onSetNotes,
  onSetVehicleNumber, onSetPickupTime, onPlaceOrder, isAdditionalOrder,
}: CartSheetProps) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = subtotal + deliveryCharges + taxAmount + serviceChargeAmount;
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);
  const isDelivery = orderType === 'delivery';
  const isTakeaway = orderType === 'takeaway';
  const needsCustomerInfo = isDelivery || isTakeaway;
  const canPlace = cart.length > 0 && !placing &&
    (!needsCustomerInfo || (customerName && customerPhone)) &&
    (!isDelivery || customerAddress);

  const orderLabel = orderType === 'dine_in' ? 'Dine-in' : orderType === 'takeaway' ? 'Takeaway' : 'Delivery';

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto animate-in slide-in-from-bottom duration-300">
      <div className="max-w-lg mx-auto min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-foreground">Your Order</h2>
              <p className="text-[11px] text-muted-foreground">{itemCount} item{itemCount > 1 ? 's' : ''} · {orderLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 p-4 space-y-2">
          {cart.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-card rounded-2xl p-3 border shadow-card">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-accent/20 text-xl">🍽️</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-sm text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Rs.{item.price} × {item.quantity} = <span className="font-semibold text-foreground">Rs.{item.price * item.quantity}</span></p>
              </div>
              <div className="flex items-center gap-1 bg-muted rounded-full p-0.5">
                <button onClick={() => onUpdateQty(item.id, -1)} className="h-7 w-7 rounded-full bg-background flex items-center justify-center shadow-sm active:scale-90 transition-transform">
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-5 text-center text-sm font-bold text-foreground">{item.quantity}</span>
                <button onClick={() => onUpdateQty(item.id, 1)} className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm active:scale-90 transition-transform">
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}

          {/* Customer Info */}
          <div className="pt-4 space-y-3">
            <h3 className="font-heading font-bold text-sm text-foreground">
              {isDelivery ? '🛵 Delivery Details' : isTakeaway ? '🛍️ Takeaway Details' : '📝 Additional Info (Optional)'}
            </h3>
            <div className="space-y-2.5">
              <Input placeholder={needsCustomerInfo ? 'Full Name *  e.g. Ahmed Ali' : 'Your Name (optional)'} value={customerName} onChange={e => onSetName(e.target.value)} className="rounded-xl h-11 bg-muted/50 border-border/50 focus:bg-background" />
              <Input placeholder={needsCustomerInfo ? 'Phone Number *  03xx-xxxxxxx' : 'Phone (optional)'} value={customerPhone} onChange={e => onSetPhone(e.target.value)} className="rounded-xl h-11 bg-muted/50 border-border/50 focus:bg-background" type="tel" />
              {isDelivery && (
                <>
                  <Textarea placeholder="Delivery Address *" value={customerAddress} onChange={e => onSetAddress(e.target.value)} className="rounded-xl min-h-[60px] bg-muted/50 border-border/50 focus:bg-background" />
                  <Input placeholder="Google Maps Link (optional)" value={locationLink} onChange={e => onSetLocationLink(e.target.value)} className="rounded-xl h-11 bg-muted/50 border-border/50 focus:bg-background" />
                </>
              )}
              {isTakeaway && (
                <>
                  <Input placeholder="Vehicle Number (optional)  e.g. ABC-123" value={vehicleNumber} onChange={e => onSetVehicleNumber(e.target.value)} className="rounded-xl h-11 bg-muted/50 border-border/50 focus:bg-background" />
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Expected Pickup Time</label>
                    <Input type="time" value={pickupTime} onChange={e => onSetPickupTime(e.target.value)} className="rounded-xl h-11 bg-muted/50 border-border/50 focus:bg-background" />
                  </div>
                </>
              )}
              <Textarea placeholder="Special instructions or notes..." value={orderNotes} onChange={e => onSetNotes(e.target.value)} className="rounded-xl min-h-[50px] bg-muted/50 border-border/50 focus:bg-background" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t p-4 space-y-3">
          {/* Bill breakdown */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span><span>Rs.{subtotal.toLocaleString()}</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Tax ({taxPercentage}%)</span><span>Rs.{Math.round(taxAmount).toLocaleString()}</span>
              </div>
            )}
            {serviceChargeAmount > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Service Charge ({serviceChargePercentage}%)</span><span>Rs.{Math.round(serviceChargeAmount).toLocaleString()}</span>
              </div>
            )}
            {deliveryCharges > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Delivery Charges</span><span>Rs.{deliveryCharges.toLocaleString()}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="font-heading font-extrabold text-xl text-foreground">Rs.{total.toLocaleString()}</p>
            </div>
            <Button
              className="px-8 py-6 text-sm rounded-2xl font-bold shadow-lg gap-2"
              onClick={onPlaceOrder}
              disabled={!canPlace}
            >
              {placing ? 'Placing...' : isAdditionalOrder ? `Add to Order` : `Place ${orderLabel} Order`}
              {!placing && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
