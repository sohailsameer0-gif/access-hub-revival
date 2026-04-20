// Single source of truth for plan metadata + limit resolution from platform_settings.
// Plans use these enum values internally:
//   free_demo  -> "Free Trial"
//   basic      -> "Basic"
//   standard   -> "Standard"
//   pro        -> "Premium"

export type PlanKey = 'free_demo' | 'basic' | 'standard' | 'pro';

export const PLAN_LABEL: Record<PlanKey, string> = {
  free_demo: 'Free Trial',
  basic: 'Basic',
  standard: 'Standard',
  pro: 'Premium',
};

export interface PlanLimits {
  /** 0 = unlimited */
  maxMenuItems: number;
  /** 0 = unlimited */
  maxTables: number;
  enableDelivery: boolean;
  enableReports: boolean;
  enableBranding: boolean;
  /** PKR price for paid plans; null for free trial */
  price: number | null;
}

export interface PlatformSettingsLike {
  demo_duration_days: number;
  basic_plan_price: number;
  standard_plan_price: number;
  pro_plan_price: number;
  enable_demo_signup: boolean;
  demo_max_menu_items: number;
  demo_max_tables: number;
  basic_max_menu_items: number;
  basic_max_tables: number;
  basic_enable_delivery: boolean;
  basic_enable_reports: boolean;
  standard_max_menu_items: number;
  standard_max_tables: number;
  standard_enable_delivery: boolean;
  standard_enable_reports: boolean;
  premium_max_menu_items: number;
  premium_max_tables: number;
  premium_enable_delivery: boolean;
  premium_enable_reports: boolean;
  premium_enable_branding: boolean;
  support_whatsapp?: string;
  support_email?: string;
}

/** Sensible fallbacks if platform_settings hasn't loaded yet */
export const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsLike = {
  demo_duration_days: 7,
  basic_plan_price: 1500,
  standard_plan_price: 2500,
  pro_plan_price: 3500,
  enable_demo_signup: true,
  demo_max_menu_items: 15,
  demo_max_tables: 3,
  basic_max_menu_items: 50,
  basic_max_tables: 10,
  basic_enable_delivery: false,
  basic_enable_reports: true,
  standard_max_menu_items: 150,
  standard_max_tables: 25,
  standard_enable_delivery: true,
  standard_enable_reports: true,
  premium_max_menu_items: 0,
  premium_max_tables: 0,
  premium_enable_delivery: true,
  premium_enable_reports: true,
  premium_enable_branding: true,
  support_whatsapp: '',
  support_email: '',
};

export function getPlanLimits(plan: PlanKey, settings: PlatformSettingsLike): PlanLimits {
  switch (plan) {
    case 'free_demo':
      return {
        maxMenuItems: settings.demo_max_menu_items,
        maxTables: settings.demo_max_tables,
        enableDelivery: false,
        enableReports: false,
        enableBranding: false,
        price: null,
      };
    case 'basic':
      return {
        maxMenuItems: settings.basic_max_menu_items,
        maxTables: settings.basic_max_tables,
        enableDelivery: settings.basic_enable_delivery,
        enableReports: settings.basic_enable_reports,
        enableBranding: false,
        price: settings.basic_plan_price,
      };
    case 'standard':
      return {
        maxMenuItems: settings.standard_max_menu_items,
        maxTables: settings.standard_max_tables,
        enableDelivery: settings.standard_enable_delivery,
        enableReports: settings.standard_enable_reports,
        enableBranding: false,
        price: settings.standard_plan_price,
      };
    case 'pro':
      return {
        maxMenuItems: settings.premium_max_menu_items,
        maxTables: settings.premium_max_tables,
        enableDelivery: settings.premium_enable_delivery,
        enableReports: settings.premium_enable_reports,
        enableBranding: settings.premium_enable_branding,
        price: settings.pro_plan_price,
      };
  }
}

export const PLAN_ORDER: PlanKey[] = ['free_demo', 'basic', 'standard', 'pro'];

/** Friendly feature bullets for plan cards */
export function planFeatureList(plan: PlanKey, limits: PlanLimits): string[] {
  const items = [
    limits.maxMenuItems === 0 ? 'Unlimited menu items' : `${limits.maxMenuItems} menu items`,
    limits.maxTables === 0 ? 'Unlimited tables' : `${limits.maxTables} tables`,
    'QR ordering & dine-in',
    'Takeaway orders',
    limits.enableDelivery ? 'Delivery orders' : null,
    limits.enableReports ? 'Sales reports & analytics' : null,
    limits.enableBranding ? 'Custom branding' : null,
    plan === 'pro' ? 'Priority support' : null,
  ];
  return items.filter(Boolean) as string[];
}
