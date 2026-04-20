import { useOutlet, useTables } from '@/hooks/useData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Download, QrCode, Utensils, ShoppingBag } from 'lucide-react';
import { useRef, useCallback } from 'react';

interface QRCardProps {
  label: string;
  url: string;
  purposeText: string;
  outletName: string;
  outletLogoUrl?: string | null;
  tableNumber?: string;
}

function QRCard({ label, url, purposeText, outletName, outletLogoUrl, tableNumber }: QRCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(() => {
    const container = ref.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 600, H = 820;
    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, 24);
    ctx.fill();

    // Top accent bar
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#f97316');
    grad.addColorStop(1, '#ea580c');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(0, 0, W, 8, [24, 24, 0, 0]);
    ctx.fill();

    let y = 48;

    // Outlet name
    ctx.fillStyle = '#18181b';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(outletName, W / 2, y);
    y += 20;

    // Divider
    y += 16;
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(W - 60, y);
    ctx.stroke();
    y += 24;

    // Table number badge
    if (tableNumber) {
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.roundRect(W / 2 - 80, y, 160, 36, 18);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(`Table ${tableNumber}`, W / 2, y + 24);
      y += 52;
    }

    // QR code
    const svg = container.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const qrSize = 320;
      const qrX = (W - qrSize) / 2;

      // QR border
      ctx.fillStyle = '#fafafa';
      ctx.beginPath();
      ctx.roundRect(qrX - 20, y - 10, qrSize + 40, qrSize + 40, 16);
      ctx.fill();
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(qrX - 20, y - 10, qrSize + 40, qrSize + 40, 16);
      ctx.stroke();

      ctx.drawImage(img, qrX, y, qrSize, qrSize);
      y += qrSize + 52;

      // Purpose text
      ctx.fillStyle = '#3f3f46';
      ctx.font = '600 17px system-ui, sans-serif';
      const lines = wrapText(ctx, purposeText, W - 120);
      lines.forEach(line => {
        ctx.fillText(line, W / 2, y);
        y += 24;
      });

      y += 16;
      // URL hint
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText('Powered by OrderEase', W / 2, H - 30);

      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `${label.replace(/\s+/g, '-')}-qr.png`;
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, [label, outletName, purposeText, tableNumber]);

  return (
    <Card className="shadow-card overflow-hidden group hover:shadow-lg transition-shadow">
      {/* Top accent */}
      <div className="h-1.5 bg-gradient-to-r from-primary to-primary/70" />
      <CardContent className="flex flex-col items-center gap-4 p-6">
        {/* Outlet branding */}
        {outletLogoUrl ? (
          <img src={outletLogoUrl} alt={outletName} className="w-12 h-12 rounded-xl object-cover ring-2 ring-border" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <span className="text-lg font-bold text-primary-foreground">{outletName.charAt(0)}</span>
          </div>
        )}
        <p className="font-heading text-sm font-semibold text-foreground">{outletName}</p>

        {/* Table badge */}
        {tableNumber && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <Utensils className="h-3 w-3" />
            Table {tableNumber}
          </span>
        )}

        {/* QR */}
        <div ref={ref} className="bg-card p-4 rounded-2xl border">
          <QRCodeSVG value={url} size={180} level="M" />
        </div>

        {/* Purpose text */}
        <p className="text-sm font-medium text-foreground text-center leading-relaxed max-w-[220px]">{purposeText}</p>

        {/* URL */}
        <p className="text-[10px] text-muted-foreground/60 text-center break-all max-w-[240px]">{url}</p>

        <Button variant="outline" size="sm" onClick={handleDownload} className="mt-1 gap-1.5">
          <Download className="h-4 w-4" /> Download PNG
        </Button>
      </CardContent>
    </Card>
  );
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default function QRCodes() {
  const { data: outlet } = useOutlet();
  const { data: tables } = useTables(outlet?.id);

  if (!outlet) return <p className="text-muted-foreground">Please set up your outlet first.</p>;

  const baseUrl = window.location.origin;
  const menuUrl = `${baseUrl}/menu/${outlet.slug}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">QR Codes</h1>
        <p className="text-muted-foreground">Branded QR codes for your outlet — ready to print</p>
      </div>

      {/* Public / Delivery QR */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold text-foreground">Public Menu QR</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Share this QR for delivery & takeaway orders</p>
        <div className="max-w-xs">
          <QRCard
            label={`${outlet.name}-menu`}
            url={menuUrl}
            purposeText="Scan to View Menu & Order Online"
            outletName={outlet.name}
            outletLogoUrl={outlet.logo_url}
          />
        </div>
      </div>

      {/* Table QRs */}
      {tables && tables.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Utensils className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold text-foreground">Table QR Codes</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Place these on each table for dine-in ordering</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tables.map(t => (
              <QRCard
                key={t.id}
                label={`Table-${t.table_number}`}
                url={`${menuUrl}?table=${t.id}`}
                purposeText="Scan to View Menu & Place Your Order"
                outletName={outlet.name}
                outletLogoUrl={outlet.logo_url}
                tableNumber={t.table_number}
              />
            ))}
          </div>
        </div>
      )}

      {(!tables || tables.length === 0) && (
        <Card className="shadow-card">
          <CardContent className="py-8 text-center text-muted-foreground">
            <QrCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Add tables first to generate table-specific QR codes.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
