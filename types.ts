

export enum StockType {
  FOR_PRODUCTION = 'FOR_PRODUCTION',
  FOR_SALE = 'FOR_SALE'
}

export enum TransactionType {
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT'
}

export enum TransactionCategory {
  STOCK_PURCHASE = 'STOCK_PURCHASE',
  SALES = 'SALES',
  PRODUCTION_COST = 'PRODUCTION_COST',
  OPERATIONAL = 'OPERATIONAL'
}

export interface Batch {
  id: string;
  productName: string;
  initialQuantity: number;
  currentQuantity: number;
  buyPrice: number;
  stockType: StockType;
  createdAt: number;
}

export interface ProductionUsage {
  id: string;
  productionId: string;
  batchId: string;
  quantityUsed: number;
  costPerUnit: number;
}

export interface ProductionRecord {
  id: string;
  outputProductName: string;
  outputQuantity: number;
  totalHPP: number;
  createdAt: number;
  batchIdCreated?: string;
}

export interface SaleRecord {
  id: string;
  productName: string;
  quantity: number;
  salePrice: number;
  totalRevenue: number;
  totalCOGS: number;
  createdAt: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string;
  createdAt: number;
  relatedId?: string;
}

export interface AppSettings {
  businessName: string;
  theme: 'light' | 'dark';
  supabaseUrl: string;
  supabaseAnonKey: string;
  useCloud: boolean;
}

export interface AppState {
  batches: Batch[];
  productions: ProductionRecord[];
  productionUsages: ProductionUsage[];
  sales: SaleRecord[];
  transactions: Transaction[];
  settings: AppSettings;
  isSyncing: boolean;
  /* Fixed: Changed user type to any due to Supabase import errors */
  user: any | null;
}
