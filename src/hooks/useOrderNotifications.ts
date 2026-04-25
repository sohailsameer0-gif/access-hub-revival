import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// Shared AudioContext that survives across hook calls and is unlocked on first user gesture.
// This is required by browser autoplay policies — without a user interaction first, sound
// will be silently blocked on most mobile browsers and on desktop Chrome/Safari.
let sharedAudioCtx: AudioContext | null = null;
let audioUnlocked = false;

function ensureAudioUnlocked() {
  if (audioUnlocked && sharedAudioCtx) return;
  try {
    if (!sharedAudioCtx) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      if (!Ctx) return;
      sharedAudioCtx = new Ctx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => { /* ignore */ });
    }
    // Play a silent buffer to fully unlock audio on iOS Safari.
    const buf = sharedAudioCtx.createBuffer(1, 1, 22050);
    const src = sharedAudioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(sharedAudioCtx.destination);
    src.start(0);
    audioUnlocked = true;
  } catch { /* ignore */ }
}

// Install one-time global gesture listeners so sound works on every device the
// outlet owner is logged in on, without each tab needing its own click first.
if (typeof window !== 'undefined') {
  const unlock = () => ensureAudioUnlocked();
  window.addEventListener('pointerdown', unlock, { once: false, passive: true });
  window.addEventListener('keydown', unlock, { once: false, passive: true });
  window.addEventListener('touchstart', unlock, { once: false, passive: true });
  // Re-unlock when tab becomes visible (mobile browsers suspend audio in background)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && sharedAudioCtx?.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => { /* ignore */ });
    }
  });
}

// Generate a notification chime using Web Audio API on the shared context
function playNotificationSound() {
  try {
    ensureAudioUnlocked();
    const ctx = sharedAudioCtx;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => { /* ignore */ });

    const playBeep = (startTime: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
      osc.start(startTime);
      osc.stop(startTime + 0.32);
    };

    const now = ctx.currentTime;
    playBeep(now, 880);        // A5
    playBeep(now + 0.15, 1100); // C#6
    playBeep(now + 0.30, 1320); // E6
  } catch {
    // Audio not available, silently ignore
  }
}


export function useOrderNotifications(outletId?: string) {
  const queryClient = useQueryClient();
  const isFirstLoad = useRef(true);
  // Track pending (unaccepted) order IDs for repeating sound and badge count
  const [pendingOrderIds, setPendingOrderIds] = useState<Set<string>>(new Set());
  const soundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start or stop repeating sound based on pending orders
  useEffect(() => {
    if (pendingOrderIds.size > 0) {
      // Play immediately and then every 5 seconds
      playNotificationSound();
      if (!soundIntervalRef.current) {
        soundIntervalRef.current = setInterval(() => {
          playNotificationSound();
        }, 5000);
      }
    } else {
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
        soundIntervalRef.current = null;
      }
    }
    return () => {
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
        soundIntervalRef.current = null;
      }
    };
  }, [pendingOrderIds]);

  const handleNewOrder = useCallback((payload: any) => {
    if (isFirstLoad.current) return;

    const order = payload.new;
    const orderType = order.order_type || 'dine_in';
    const typeLabel = orderType === 'dine_in' ? '🍽️ Dine-in' : orderType === 'delivery' ? '🛵 Delivery' : '🛍️ Takeaway';
    const customerName = order.customer_name || 'Customer';
    const total = order.total || order.subtotal || 0;

    // Add to pending set (will trigger repeating sound)
    setPendingOrderIds(prev => new Set(prev).add(order.id));

    toast.success(`${typeLabel} — New Order!`, {
      description: `${customerName} • Rs.${total.toLocaleString()}`,
      duration: 8000,
      action: {
        label: 'View Orders',
        onClick: () => {
          window.location.hash = '';
          window.location.pathname = '/outlet/orders';
        },
      },
    });

    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [queryClient]);

  // Listen for order status updates to remove from pending when accepted
  const handleOrderUpdate = useCallback((payload: any) => {
    const updated = payload.new;
    if (updated.status !== 'pending') {
      setPendingOrderIds(prev => {
        const next = new Set(prev);
        next.delete(updated.id);
        return next;
      });
    }
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [queryClient]);

  const handleBillRequest = useCallback((payload: any) => {
    if (isFirstLoad.current) return;

    playNotificationSound();

    toast.info('📋 Bill Requested!', {
      description: 'A customer has requested their bill.',
      duration: 8000,
    });

    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [queryClient]);

  useEffect(() => {
    if (!outletId) return;

    isFirstLoad.current = true;
    const timer = setTimeout(() => {
      isFirstLoad.current = false;
    }, 3000);

    // Subscribe to new orders
    const ordersChannel = supabase
      .channel(`realtime-orders-${outletId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `outlet_id=eq.${outletId}`,
        },
        handleNewOrder
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `outlet_id=eq.${outletId}`,
        },
        handleOrderUpdate
      )
      .subscribe();

    // Subscribe to bill requests
    const billChannel = supabase
      .channel(`realtime-bills-${outletId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bill_requests',
          filter: `outlet_id=eq.${outletId}`,
        },
        handleBillRequest
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(billChannel);
    };
  }, [outletId, handleNewOrder, handleOrderUpdate, handleBillRequest]);

  return { pendingCount: pendingOrderIds.size };
}
