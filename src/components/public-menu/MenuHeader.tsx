import { MessageCircle, Phone, MapPin, Clock } from 'lucide-react';

interface MenuHeaderProps {
  outlet: {
    name: string;
    description?: string | null;
    logo_url?: string | null;
    cover_image_url?: string | null;
    whatsapp?: string | null;
    phone?: string | null;
    google_maps_link?: string | null;
    address?: string | null;
    city?: string | null;
    opening_hours?: any;
  };
}

export default function MenuHeader({ outlet }: MenuHeaderProps) {
  return (
    <div className="relative">
      {/* Hero Cover */}
      <div className="h-56 relative overflow-hidden">
        {outlet.cover_image_url ? (
          <img src={outlet.cover_image_url} alt={outlet.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary via-primary/80 to-secondary/60" />
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-foreground/10" />

        {/* Quick action buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          {outlet.whatsapp && (
            <a href={`https://wa.me/${outlet.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
              className="h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
              <MessageCircle className="h-[18px] w-[18px] text-primary" />
            </a>
          )}
          {outlet.phone && (
            <a href={`tel:${outlet.phone}`}
              className="h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
              <Phone className="h-[18px] w-[18px] text-primary" />
            </a>
          )}
          {outlet.google_maps_link && (
            <a href={outlet.google_maps_link} target="_blank" rel="noopener noreferrer"
              className="h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
              <MapPin className="h-[18px] w-[18px] text-primary" />
            </a>
          )}
        </div>
      </div>

      {/* Restaurant Info Card - overlapping the cover */}
      <div className="relative -mt-24 mx-4 z-[1]">
        <div className="bg-card rounded-2xl p-5 shadow-lg border">
          <div className="flex items-start gap-4">
            {/* Logo */}
            {outlet.logo_url ? (
              <img src={outlet.logo_url} alt={outlet.name}
                className="w-16 h-16 rounded-2xl object-cover shadow-md ring-2 ring-background shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shrink-0">
                <span className="text-2xl font-bold text-primary-foreground">{outlet.name.charAt(0)}</span>
              </div>
            )}
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="font-heading text-lg font-extrabold text-foreground leading-tight">{outlet.name}</h1>
              {outlet.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{outlet.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                {(outlet.address || outlet.city) && (
                  <span className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0 text-primary/60" />
                    <span className="truncate max-w-[160px]">{outlet.address || outlet.city}</span>
                  </span>
                )}
                {outlet.phone && (
                  <span className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0 text-primary/60" />
                    {outlet.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
