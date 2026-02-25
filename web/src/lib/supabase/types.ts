export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface TlsTalosRow {
  id: string;
  onChainId: number | null;
  agentName: string | null;
  name: string;
  category: string;
  description: string;
  status: string;
  stellarAssetCode: string | null;
  tokenSymbol: string | null;
  pulsePrice: string;
  totalSupply: number;
  creatorShare: number;
  investorShare: number;
  treasuryShare: number;
  apiKey: string | null;
  persona: string | null;
  targetAudience: string | null;
  channels: string[];
  toneVoice: string | null;
  approvalThreshold: string;
  gtmBudget: string;
  minPatronPulse: number | null;
  agentOnline: boolean;
  agentLastSeen: string | null;
  walletPublicKey: string | null;
  creatorPublicKey: string | null;
  investorPublicKey: string | null;
  treasuryPublicKey: string | null;
  agentWalletId: string | null;
  agentWalletAddress: string | null;
  flapLaunchTxHash: string | null;
  xApiKey: string | null;
  xApiKeySecret: string | null;
  xAccessToken: string | null;
  xAccessTokenSecret: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TlsPatronsRow {
  id: string;
  talosId: string;
  stellarPublicKey: string;
  role: string;
  pulseAmount: number;
  share: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TlsActivitiesRow {
  id: string;
  talosId: string;
  type: string;
  content: string;
  channel: string;
  status: string;
  createdAt: string;
}

export interface TlsApprovalsRow {
  id: string;
  talosId: string;
  type: string;
  title: string;
  description: string | null;
  amount: string | null;
  status: string;
  decidedAt: string | null;
  decidedBy: string | null;
  txHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TlsRevenuesRow {
  id: string;
  talosId: string;
  amount: string;
  currency: string;
  source: string;
  txHash: string | null;
  createdAt: string;
}

export interface TlsCommerceServicesRow {
  id: string;
  talosId: string;
  serviceName: string;
  description: string | null;
  price: string;
  currency: string;
  stellarPublicKey: string;
  chains: string[];
  fulfillmentMode: string;
  createdAt: string;
  updatedAt: string;
}

export interface TlsCommerceJobsRow {
  id: string;
  talosId: string;
  requesterTalosId: string;
  serviceName: string;
  payload: Json | null;
  result: Json | null;
  status: string;
  paymentSig: string | null;
  txHash: string | null;
  amount: string;
  createdAt: string;
  updatedAt: string;
}

export interface TlsPlaybooksRow {
  id: string;
  talosId: string;
  title: string;
  category: string;
  channel: string;
  description: string;
  price: string;
  currency: string;
  version: number;
  tags: string[];
  status: string;
  content: Json | null;
  impressions: number;
  engagementRate: string;
  conversions: number;
  periodDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface TlsPlaybookPurchasesRow {
  id: string;
  playbookId: string;
  buyerPublicKey: string;
  appliedAt: string | null;
  txHash: string | null;
  createdAt: string;
}

export interface TlsApiAuditLogsRow {
  id: string;
  talosId: string;
  method: string;
  path: string;
  statusCode: number;
  ipAddress: string | null;
  createdAt: string;
}

export type Database = {
  public: {
    Tables: {
      tls_talos: {
        Row: TlsTalosRow & Record<string, unknown>;
        Insert: (Partial<TlsTalosRow> & Pick<TlsTalosRow, "id" | "name" | "category" | "description">) &
          Record<string, unknown>;
        Update: Partial<TlsTalosRow> & Record<string, unknown>;
        Relationships: [];
      };
      tls_patrons: {
        Row: TlsPatronsRow & Record<string, unknown>;
        Insert: (Partial<TlsPatronsRow> & Pick<TlsPatronsRow, "id" | "talosId" | "stellarPublicKey" | "role" | "share">) &
          Record<string, unknown>;
        Update: Partial<TlsPatronsRow> & Record<string, unknown>;
        Relationships: [];
      };
      tls_activities: {
        Row: TlsActivitiesRow & Record<string, unknown>;
        Insert: (Partial<TlsActivitiesRow> & Pick<TlsActivitiesRow, "id" | "talosId" | "type" | "content" | "channel">) &
          Record<string, unknown>;
        Update: Partial<TlsActivitiesRow> & Record<string, unknown>;
        Relationships: [];
      };
      tls_approvals: {
        Row: TlsApprovalsRow & Record<string, unknown>;
        Insert: (Partial<TlsApprovalsRow> & Pick<TlsApprovalsRow, "id" | "talosId" | "type" | "title">) &
          Record<string, unknown>;
        Update: Partial<TlsApprovalsRow> & Record<string, unknown>;
        Relationships: [];
      };
      tls_revenues: {
        Row: TlsRevenuesRow & Record<string, unknown>;
        Insert: (Partial<TlsRevenuesRow> & Pick<TlsRevenuesRow, "id" | "talosId" | "amount" | "source">) &
          Record<string, unknown>;
        Update: Partial<TlsRevenuesRow> & Record<string, unknown>;
        Relationships: [];
      };
      tls_commerce_services: {
        Row: TlsCommerceServicesRow & Record<string, unknown>;
        Insert: (Partial<TlsCommerceServicesRow> &
          Pick<TlsCommerceServicesRow, "id" | "talosId" | "serviceName" | "price" | "stellarPublicKey">) &
          Record<string, unknown>;
        Update: Partial<TlsCommerceServicesRow> & Record<string, unknown>;
        Relationships: [];
      };
      tls_commerce_jobs: {
        Row: TlsCommerceJobsRow & Record<string, unknown>;
        Insert: (Partial<TlsCommerceJobsRow> &
          Pick<TlsCommerceJobsRow, "id" | "talosId" | "requesterTalosId" | "serviceName" | "amount">) &
          Record<string, unknown>;
        Update: Partial<TlsCommerceJobsRow> & Record<string, unknown>;
        Relationships: [];
      };
      tls_playbooks: {
        Row: TlsPlaybooksRow & Record<string, unknown>;
        Insert: (Partial<TlsPlaybooksRow> &
          Pick<TlsPlaybooksRow, "id" | "talosId" | "title" | "category" | "channel" | "description" | "price">) &
          Record<string, unknown>;
        Update: Partial<TlsPlaybooksRow> & Record<string, unknown>;
        Relationships: [];
      };
      tls_playbook_purchases: {
        Row: TlsPlaybookPurchasesRow & Record<string, unknown>;
        Insert: (Partial<TlsPlaybookPurchasesRow> & Pick<TlsPlaybookPurchasesRow, "id" | "playbookId" | "buyerPublicKey">) &
          Record<string, unknown>;
        Update: Partial<TlsPlaybookPurchasesRow> & Record<string, unknown>;
        Relationships: [];
      };
      tls_api_audit_logs: {
        Row: TlsApiAuditLogsRow & Record<string, unknown>;
        Insert: (Partial<TlsApiAuditLogsRow> & Pick<TlsApiAuditLogsRow, "id" | "talosId" | "method" | "path" | "statusCode">) &
          Record<string, unknown>;
        Update: Partial<TlsApiAuditLogsRow> & Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
