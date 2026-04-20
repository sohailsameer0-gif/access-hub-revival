import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Camera, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface OutletImageUploadProps {
  currentUrl?: string | null;
  outletId: string;
  type: 'logo' | 'cover';
  onUploaded: (url: string) => void;
  onRemoved: () => void;
}

export default function OutletImageUpload({ currentUrl, outletId, type, onUploaded, onRemoved }: OutletImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${outletId}/${type}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('outlet-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('outlet-images').getPublicUrl(path);
      onUploaded(data.publicUrl);
      toast.success(`${type === 'logo' ? 'Logo' : 'Cover image'} uploaded!`);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    }
    setUploading(false);
  };

  if (type === 'cover') {
    return (
      <div className="space-y-2">
        <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-border hover:border-primary/40 transition-colors group">
          {currentUrl ? (
            <div className="relative h-40">
              <img src={currentUrl} alt="Cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors flex items-center justify-center">
                <label className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium text-foreground flex items-center gap-2">
                    <Camera className="h-4 w-4" /> Change Cover
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
              </div>
              <button onClick={onRemoved} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-4 w-4 text-destructive" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-40 cursor-pointer">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Camera className="h-8 w-8 text-muted-foreground" />}
              <span className="text-sm text-muted-foreground mt-2">{uploading ? 'Uploading...' : 'Upload Cover Image'}</span>
              <span className="text-xs text-muted-foreground/60 mt-0.5">Recommended: 1200×400px</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <div className="relative group">
          {currentUrl ? (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border shadow-sm">
              <img src={currentUrl} alt="Logo" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors flex items-center justify-center">
                <label className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-5 w-5 text-background" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
              </div>
              <button onClick={onRemoved} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/40 flex flex-col items-center justify-center cursor-pointer transition-colors">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Camera className="h-6 w-6 text-muted-foreground" />}
              <span className="text-[10px] text-muted-foreground mt-1">{uploading ? '...' : 'Logo'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Outlet Logo</p>
          <p className="text-xs">Square image, max 5MB</p>
        </div>
      </div>
    </div>
  );
}
