/**
 * Data Normalization & Cleaning Utilities
 * Handles messy real-world data from Monday.com boards
 */

import { parse, isValid, parseISO } from "date-fns";

/**
 * Normalize a date string from various formats to ISO format
 */
export function normalizeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr || dateStr.trim() === "" || dateStr === "-" || dateStr === "N/A") return null;

  const cleaned = dateStr.trim();

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    const d = parseISO(cleaned);
    if (isValid(d)) return d.toISOString().split("T")[0];
  }

  // Common date formats to try
  const formats = [
    "dd/MM/yyyy",
    "MM/dd/yyyy",
    "d/M/yyyy",
    "M/d/yyyy",
    "dd-MM-yyyy",
    "MM-dd-yyyy",
    "dd.MM.yyyy",
    "MMMM d, yyyy",
    "MMM d, yyyy",
    "MMM yyyy",
    "Q'Q' yyyy",
    "yyyy/MM/dd",
    "d-MMM-yy",
    "d-MMM-yyyy",
  ];

  for (const fmt of formats) {
    try {
      const parsed = parse(cleaned, fmt, new Date());
      if (isValid(parsed)) return parsed.toISOString().split("T")[0];
    } catch {
      // continue
    }
  }

  // Handle "Q1 2024" style
  const quarterMatch = cleaned.match(/Q(\d)\s*(\d{4})/i);
  if (quarterMatch) {
    const q = parseInt(quarterMatch[1]);
    const yr = parseInt(quarterMatch[2]);
    const month = (q - 1) * 3 + 1;
    return `${yr}-${String(month).padStart(2, "0")}-01`;
  }

  return null;
}

/**
 * Normalize a currency/number value
 */
export function normalizeNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "" || value === "-" || value === "N/A")
    return null;

  const cleaned = value
    .toString()
    .replace(/[₹$€£,\s]/g, "") // Remove currency symbols and commas
    .replace(/\(([^)]+)\)/, "-$1") // Handle (negative) format
    .trim();

  if (cleaned === "" || cleaned === "N/A" || cleaned === "-") return null;

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Normalize status/stage values
 */
export function normalizeStatus(value: string | null | undefined): string | null {
  if (!value || value.trim() === "" || value === "-") return null;

  const cleaned = value.trim().toLowerCase();

  // Deal statuses
  const statusMap: Record<string, string> = {
    won: "Won",
    "closed won": "Won",
    closed: "Closed",
    lost: "Lost",
    "closed lost": "Lost",
    active: "Active",
    "in progress": "In Progress",
    inprogress: "In Progress",
    pending: "Pending",
    cancelled: "Cancelled",
    canceled: "Cancelled",
    open: "Open",
    new: "New",
    qualified: "Qualified",
    proposal: "Proposal",
    negotiation: "Negotiation",
    "on hold": "On Hold",
    onhold: "On Hold",
    completed: "Completed",
    delivered: "Delivered",
    billed: "Billed",
    collected: "Collected",
  };

  return statusMap[cleaned] ?? value.trim();
}

/**
 * Normalize probability/percentage value
 */
export function normalizeProbability(value: string | null | undefined): number | null {
  if (!value || value.trim() === "" || value === "-") return null;

  const cleaned = value.toString().replace(/%/, "").trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;

  // If value is between 0-1, convert to percentage
  if (num > 0 && num <= 1) return Math.round(num * 100);
  if (num >= 0 && num <= 100) return num;

  return null;
}

/**
 * Normalize sector/industry names
 */
export function normalizeSector(value: string | null | undefined): string | null {
  if (!value || value.trim() === "" || value === "-") return null;

  const cleaned = value.trim();

  const sectorMap: Record<string, string> = {
    energy: "Energy",
    "oil & gas": "Oil & Gas",
    "oil and gas": "Oil & Gas",
    power: "Power",
    renewable: "Renewable Energy",
    renewables: "Renewable Energy",
    solar: "Solar",
    wind: "Wind",
    manufacturing: "Manufacturing",
    fmcg: "FMCG",
    pharma: "Pharmaceuticals",
    pharmaceutical: "Pharmaceuticals",
    it: "IT",
    technology: "Technology",
    telecom: "Telecom",
    banking: "Banking",
    finance: "Finance",
    insurance: "Insurance",
    real_estate: "Real Estate",
    "real estate": "Real Estate",
    infrastructure: "Infrastructure",
    construction: "Construction",
    retail: "Retail",
    ecommerce: "E-Commerce",
    healthcare: "Healthcare",
    education: "Education",
    government: "Government",
    psu: "PSU",
    automotive: "Automotive",
    chemical: "Chemicals",
    logistics: "Logistics",
  };

  const key = cleaned.toLowerCase();
  return sectorMap[key] ?? cleaned;
}

/**
 * Clean a generic text field
 */
export function cleanText(value: string | null | undefined): string | null {
  if (!value || value.trim() === "" || value === "-" || value === "N/A" || value === "NA")
    return null;
  return value.trim();
}

/**
 * Normalize a full dataset row (deals board)
 */
export interface NormalizedDeal {
  id: string;
  name: string;
  ownerCode: string | null;
  clientCode: string | null;
  status: string | null;
  closeDate: string | null;
  tentativeCloseDate: string | null;
  closureProbability: number | null;
  dealValue: number | null;
  dealStage: string | null;
  product: string | null;
  sector: string | null;
  createdDate: string | null;
  group: string | null;
  rawData: Record<string, string | null>;
  dataQuality: {
    missingFields: string[];
    issues: string[];
  };
}

export function normalizeDeal(row: Record<string, string | null>): NormalizedDeal {
  const missingFields: string[] = [];
  const issues: string[] = [];

  const findField = (...keys: string[]): string | null => {
    for (const key of keys) {
      // Exact match
      if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
      // Partial match
      for (const rowKey of Object.keys(row)) {
        if (rowKey.includes(key) && row[rowKey] !== null && row[rowKey] !== "") return row[rowKey];
      }
    }
    return null;
  };

  const name = row["name"] ?? row["deal_name"] ?? row["deal_name_masked"] ?? null;
  if (!name) missingFields.push("name");

  const ownerCode = findField("owner_code", "owner", "bd_kam");
  const clientCode = findField("client_code", "client", "customer");
  const statusRaw = findField("deal_status", "status");
  const closeDateRaw = findField("close_date", "close_date__a_", "closure_date");
  const tentativeDateRaw = findField("tentative_close_date", "tentative");
  const probabilityRaw = findField("closure_probability", "probability");
  const dealValueRaw = findField("masked_deal_value", "deal_value", "value");
  const dealStageRaw = findField("deal_stage", "stage");
  const productRaw = findField("product_deal", "product", "service");
  const sectorRaw = findField("sector_service", "sector", "industry");
  const createdRaw = findField("created_date", "created_at");

  const closeDate = normalizeDate(closeDateRaw);
  if (closeDateRaw && !closeDate) issues.push(`Invalid close date format: "${closeDateRaw}"`);

  const tentativeCloseDate = normalizeDate(tentativeDateRaw);
  const dealValue = normalizeNumber(dealValueRaw);
  if (dealValueRaw && dealValue === null) issues.push(`Could not parse deal value: "${dealValueRaw}"`);

  const closureProbability = normalizeProbability(probabilityRaw);
  const createdDate = normalizeDate(createdRaw);

  if (!ownerCode) missingFields.push("ownerCode");
  if (!clientCode) missingFields.push("clientCode");
  if (!statusRaw) missingFields.push("status");
  if (!sectorRaw) missingFields.push("sector");
  if (dealValue === null) missingFields.push("dealValue");

  return {
    id: row["id"] ?? "",
    name: name ?? "Unknown Deal",
    ownerCode: cleanText(ownerCode),
    clientCode: cleanText(clientCode),
    status: normalizeStatus(statusRaw),
    closeDate,
    tentativeCloseDate,
    closureProbability,
    dealValue,
    dealStage: cleanText(dealStageRaw),
    product: cleanText(productRaw),
    sector: normalizeSector(sectorRaw),
    createdDate,
    group: row["group"] ?? null,
    rawData: row,
    dataQuality: { missingFields, issues },
  };
}

/**
 * Normalized Work Order
 */
export interface NormalizedWorkOrder {
  id: string;
  name: string;
  customerCode: string | null;
  serialNumber: string | null;
  natureOfWork: string | null;
  executionStatus: string | null;
  deliveryDate: string | null;
  poDate: string | null;
  documentType: string | null;
  probableStartDate: string | null;
  probableEndDate: string | null;
  bdKamCode: string | null;
  sector: string | null;
  typeOfWork: string | null;
  platform: string | null;
  lastInvoiceDate: string | null;
  latestInvoiceNo: string | null;
  billedValueExGst: number | null;
  billedValueIncGst: number | null;
  collectionAmount: number | null;
  amountReceivable: number | null;
  arPriority: string | null;
  quantityByOps: number | null;
  quantitiesPerPo: number | null;
  quantityBilled: number | null;
  balanceQuantity: number | null;
  invoiceStatus: string | null;
  expectedBillingMonth: string | null;
  actualBillingMonth: string | null;
  actualCollectionMonth: string | null;
  woStatus: string | null;
  collectionStatus: string | null;
  collectionDate: string | null;
  billingStatus: string | null;
  group: string | null;
  rawData: Record<string, string | null>;
  dataQuality: {
    missingFields: string[];
    issues: string[];
  };
}

export function normalizeWorkOrder(row: Record<string, string | null>): NormalizedWorkOrder {
  const missingFields: string[] = [];
  const issues: string[] = [];

  const findField = (...keys: string[]): string | null => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
      for (const rowKey of Object.keys(row)) {
        if (rowKey.toLowerCase().includes(key.toLowerCase()) && row[rowKey] !== null && row[rowKey] !== "")
          return row[rowKey];
      }
    }
    return null;
  };

  const name = row["name"] ?? row["deal_name_masked"] ?? null;
  const customerCode = findField("customer_name_code", "customer");
  const executionStatus = findField("execution_status", "status");
  const deliveryDate = normalizeDate(findField("data_delivery_date", "delivery_date"));
  const poDate = normalizeDate(findField("date_of_po_loi", "po_date"));
  const sector = normalizeSector(findField("sector", "industry"));
  const typeOfWork = cleanText(findField("type_of_work", "work_type"));

  const billedExGstRaw = findField("billed_value_in_rupees__excl_of_gst___masked_", "billed_value_excl", "billed_ex_gst");
  const billedIncGstRaw = findField("billed_value_in_rupees__incl_of_gst___masked_", "billed_value_incl", "billed_inc_gst");
  const collectionRaw = findField("collected_an", "collection_amount", "collected");
  const receivableRaw = findField("amount_receivable", "ar_amount", "receivable");

  const billedValueExGst = normalizeNumber(billedExGstRaw);
  const billedValueIncGst = normalizeNumber(billedIncGstRaw);
  const collectionAmount = normalizeNumber(collectionRaw);
  const amountReceivable = normalizeNumber(receivableRaw);

  if (!executionStatus) missingFields.push("executionStatus");
  if (!sector) missingFields.push("sector");
  if (billedValueIncGst === null) missingFields.push("billedValue");

  return {
    id: row["id"] ?? "",
    name: name ?? "Unknown Work Order",
    customerCode: cleanText(customerCode),
    serialNumber: cleanText(findField("serial_", "serial_no", "serial")),
    natureOfWork: cleanText(findField("nature_of_work", "nature")),
    executionStatus: normalizeStatus(executionStatus),
    deliveryDate,
    poDate,
    documentType: cleanText(findField("document_type", "doc_type")),
    probableStartDate: normalizeDate(findField("probable_start_date", "start_date")),
    probableEndDate: normalizeDate(findField("probable_end_date", "end_date")),
    bdKamCode: cleanText(findField("bd_kam_personnel_code", "bd_kam", "kam")),
    sector,
    typeOfWork,
    platform: cleanText(findField("platform", "paltform")),
    lastInvoiceDate: normalizeDate(findField("last_invoice_date", "invoice_date")),
    latestInvoiceNo: cleanText(findField("latest_invoice_no", "invoice_no")),
    billedValueExGst,
    billedValueIncGst,
    collectionAmount,
    amountReceivable,
    arPriority: cleanText(findField("ar_priority", "priority")),
    quantityByOps: normalizeNumber(findField("quantity_by_ops", "qty_ops")),
    quantitiesPerPo: normalizeNumber(findField("quantities_as_per_po", "po_qty")),
    quantityBilled: normalizeNumber(findField("quantity_billed", "qty_billed")),
    balanceQuantity: normalizeNumber(findField("balance_in_quantity", "balance_qty")),
    invoiceStatus: normalizeStatus(findField("invoice_status")),
    expectedBillingMonth: normalizeDate(findField("expected_billing_month", "exp_billing")),
    actualBillingMonth: normalizeDate(findField("actual_billing_month")),
    actualCollectionMonth: normalizeDate(findField("actual_collection_month")),
    woStatus: normalizeStatus(findField("wo_status__billed_", "wo_status")),
    collectionStatus: normalizeStatus(findField("collection_status")),
    collectionDate: normalizeDate(findField("collection_date")),
    billingStatus: normalizeStatus(findField("billing_status")),
    group: row["group"] ?? null,
    rawData: row,
    dataQuality: { missingFields, issues },
  };
}

/**
 * Calculate data quality score (0-100)
 */
export function calculateDataQuality(rows: Array<{ dataQuality: { missingFields: string[] } }>, totalFields: number): number {
  if (rows.length === 0) return 0;
  const totalPossible = rows.length * totalFields;
  const totalMissing = rows.reduce((sum, r) => sum + r.dataQuality.missingFields.length, 0);
  return Math.round(((totalPossible - totalMissing) / totalPossible) * 100);
}
