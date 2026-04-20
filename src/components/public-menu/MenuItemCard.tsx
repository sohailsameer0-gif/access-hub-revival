import { Plus, Minus } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  discounted_price?: number | null;
  image_url?: string | null;
  tags?: string[] | null;
}

interface MenuItemCardProps {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

const tagConfig: Record<string, { emoji: string; style: string }> = {
  popular: { emoji: '🔥', style: 'bg-secondary/15 text-secondary border-secondary/30' },
  spicy: { emoji: '🌶️', style: 'bg-destructive/10 text-destructive border-destructive/30' },
  new: { emoji: '✨', style: 'bg-primary/10 text-primary border-primary/30' },
  veg: { emoji: '🥬', style: 'bg-accent text-accent-foreground border-primary/30' },
  bestseller: { emoji: '⭐', style: 'bg-secondary/15 text-secondary border-secondary/30' },
};

export default function MenuItemCard({ item, quantity, onAdd, onIncrement, onDecrement }: MenuItemCardProps) {
  const hasDiscount = item.discounted_price != null && item.discounted_price < item.price;
  const displayPrice = hasDiscount ? item.discounted_price! : item.price;
  const discount = hasDiscount ? Math.round(((item.price - item.discounted_price!) / item.price) * 100) : 0;

  return (
    <div className="group bg-card rounded-2xl border shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden">
      <div className="flex gap-0">
        {/* Image */}
        <div className="relative shrink-0 w-[110px] sm:w-[130px]">
          <div className="h-full min-h-[120px]">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted via-muted to-accent/30">
                <span className="text-4xl opacity-50">🍽️</span>
              </div>
            )}
          </div>
          {hasDiscount && (
            <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              {discount}% OFF
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
          <div>
            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex gap-1 mb-1.5 flex-wrap">
                {item.tags.map(t => {
                  const cfg = tagConfig[t.toLowerCase()] || { emoji: '🏷️', style: 'bg-muted text-muted-foreground border-border' };
                  return (
                    <span key={t} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border inline-flex items-center gap-0.5 ${cfg.style}`}>
                      {cfg.emoji} {t}
                    </span>
                  );
                })}
              </div>
            )}
            <h3 className="font-heading font-bold text-sm text-foreground leading-snug line-clamp-1">{item.name}</h3>
            {item.description && (
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
            )}
          </div>

          {/* Price + Cart */}
          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-heading font-extrabold text-base text-foreground">Rs.{displayPrice}</span>
              {hasDiscount && (
                <span className="line-through text-[11px] text-muted-foreground/60">Rs.{item.price}</span>
              )}
            </div>

            {quantity > 0 ? (
              <div className="flex items-center gap-0.5 bg-primary rounded-full shadow-md">
                <button onClick={onDecrement} className="h-8 w-8 rounded-full flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/10 active:scale-90 transition-all">
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="font-bold text-sm w-6 text-center text-primary-foreground">{quantity}</span>
                <button onClick={onIncrement} className="h-8 w-8 rounded-full flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/10 active:scale-90 transition-all">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onAdd}
                className="flex items-center gap-1 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-md hover:shadow-lg active:scale-95 transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> ADD
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
