import { createHash } from "crypto";

type CsvRow = Record<string, string>;

const dateKeys = [
  "date",
  "postdate",
  "postingdate",
  "postedat",
  "posted_at",
  "transactiondate",
  "transaction_date",
  "processeddate",
  "processdate",
  "activitydate",
];
const descriptionKeys = [
  "description",
  "transaction",
  "transactiondescription",
  "transactiondetails",
  "details",
  "memo",
  "name",
  "payee",
  "originaldescription",
  "merchantdescription",
];
const merchantKeys = ["merchant", "merchantname", "merchant_name", "payee"];
const amountKeys = ["amount", "value"];
const inflowKeys = ["credit", "income", "inflow", "deposit"];
const outflowKeys = ["debit", "expense", "outflow", "withdrawal"];
const categoryKeys = ["category", "classification"];

type TransactionCategoryInput = {
  description: string;
  merchant?: string | null;
  category?: string | null;
  amount: number;
  direction: "INCOME" | "EXPENSE" | "TRANSFER";
};

const expenseCategoryRules = [
  { category: "Transfers", keywords: ["transfer", "zelle", "venmo", "cash app", "paypal", "ach transfer", "xfer"] },
  { category: "Housing", keywords: ["rent", "mortgage", "property tax", "hoa", "landlord", "apartment"] },
  { category: "Utilities", keywords: ["electric", "water", "gas bill", "utility", "internet", "wifi", "mobile", "wireless", "phone bill", "comcast", "xfinity", "at&t", "verizon", "t-mobile"] },
  { category: "Groceries", keywords: ["grocery", "supermarket", "whole foods", "trader joe", "aldi", "kroger", "costco", "safeway", "publix", "meijer", "heb", "sprouts", "food lion"] },
  { category: "Dining", keywords: ["restaurant", "coffee", "cafe", "doordash", "ubereats", "grubhub", "chipotle", "starbucks", "mcdonald", "taco bell", "dunkin", "panera", "subway", "pizza"] },
  { category: "Bars & Drinks", keywords: ["bar", "brew", "liquor", "wine", "beer", "drizly", "total wine"] },
  { category: "Transportation", keywords: ["uber", "lyft", "shell", "chevron", "exxon", "gas station", "parking", "toll", "transit"] },
  { category: "Auto", keywords: ["oil change", "jiffy lube", "pep boys", "autozone", "car wash", "tire", "mechanic", "repair shop"] },
  { category: "Travel", keywords: ["airbnb", "hotel", "airlines", "delta", "united", "southwest", "booking", "expedia"] },
  { category: "Shopping", keywords: ["amazon", "walmart", "target", "ebay", "etsy", "best buy", "shop"] },
  { category: "Home Improvement", keywords: ["home depot", "lowes", "ikea", "hardware", "furniture", "wayfair"] },
  { category: "Subscriptions", keywords: ["subscription", "membership", "patreon", "icloud", "google one", "dropbox", "adobe", "notion", "chatgpt", "openai"] },
  { category: "Entertainment", keywords: ["netflix", "spotify", "hulu", "disney", "steam", "xbox", "playstation", "movie", "theater"] },
  { category: "Healthcare", keywords: ["pharmacy", "walgreens", "cvs", "hospital", "clinic", "medical", "dental", "vision"] },
  { category: "Fitness", keywords: ["gym", "fitness", "planet fitness", "ymca", "peloton", "classpass"] },
  { category: "Childcare", keywords: ["daycare", "childcare", "babysit", "babysitter", "school lunch"] },
  { category: "Pet Care", keywords: ["petco", "petsmart", "veterinary", "vet", "dog food", "cat food", "grooming"] },
  { category: "Charity", keywords: ["donation", "charity", "tithe", "gofundme"] },
  { category: "Personal Care", keywords: ["salon", "barber", "spa", "cosmetic", "ulta", "sephora"] },
  { category: "Insurance", keywords: ["insurance", "geico", "progressive", "state farm", "allstate"] },
  { category: "Taxes & Fees", keywords: ["fee", "service charge", "interest charge", "late fee", "tax", "irs", "dmv"] },
  { category: "Education", keywords: ["tuition", "udemy", "coursera", "school", "college", "university"] },
  { category: "Cash Withdrawal", keywords: ["atm", "cash withdrawal"] },
] as const;

const incomeCategoryRules = [
  { category: "Salary", keywords: ["payroll", "salary", "direct deposit", "paycheck", "adp", "gusto", "workday"] },
  { category: "Transfers In", keywords: ["transfer", "zelle", "venmo", "cash app", "paypal", "ach transfer", "xfer"] },
  { category: "Refunds", keywords: ["refund", "reversal", "return", "chargeback"] },
  { category: "Interest", keywords: ["interest", "dividend", "yield"] },
  { category: "Rewards", keywords: ["reward", "cash back", "points redemption", "statement credit"] },
  { category: "Government", keywords: ["irs", "treasury", "social security", "benefit", "unemployment"] },
  { category: "Sales", keywords: ["stripe", "square", "shopify", "payout"] },
  { category: "Rental Income", keywords: ["rent payment", "tenant", "property income"] },
  { category: "Reimbursements", keywords: ["reimbursement", "expense repay", "expense reimbursement"] },
  { category: "Gifts", keywords: ["gift", "birthday", "wedding"] },
] as const;

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseMoney(value: string | undefined) {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstValue(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value) {
      return value;
    }
  }

  return "";
}

function normalizeCategory(value: string) {
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (!collapsed) {
    return "";
  }

  return collapsed
    .split(/[\/&]| +/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function inferCategoryFromText(input: TransactionCategoryInput) {
  if (input.direction === "TRANSFER") {
    return "Transfers";
  }

  const haystack = `${input.description} ${input.merchant ?? ""}`.toLowerCase();
  const rules = input.direction === "INCOME" ? incomeCategoryRules : expenseCategoryRules;

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule.category;
    }
  }

  return input.direction === "INCOME" ? "Other Income" : "Other Spending";
}

export function resolveTransactionCategory(input: TransactionCategoryInput) {
  const explicitCategory = normalizeCategory(input.category ?? "");
  if (explicitCategory) {
    return explicitCategory;
  }

  return inferCategoryFromText(input);
}

export function parseCsvTransactions(csvText: string) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("The CSV must include a header row and at least one transaction row.");
  }

  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map(normalizeKey);
  const headerSummary = rawHeaders.filter(Boolean).join(", ");

  const hasDateColumn = headers.some((header) => dateKeys.includes(header));
  if (!hasDateColumn) {
    throw new Error(
      `No supported date column was found. Detected columns: ${headerSummary || "none"}.`,
    );
  }

  const hasDescriptionColumn = headers.some((header) => descriptionKeys.includes(header));
  if (!hasDescriptionColumn) {
    throw new Error(
      `No supported description column was found. Detected columns: ${headerSummary || "none"}.`,
    );
  }

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row: CsvRow = {};

    headers.forEach((header, headerIndex) => {
      row[header] = (values[headerIndex] ?? "").trim();
    });

    const postedAtRaw = firstValue(row, dateKeys);
    const description = firstValue(row, descriptionKeys);
    const merchant = firstValue(row, merchantKeys) || description;
    const category = firstValue(row, categoryKeys) || null;

    if (!postedAtRaw) {
      throw new Error(`Row ${index + 2} is missing a usable date.`);
    }

    if (!description) {
      throw new Error(`Row ${index + 2} is missing a usable description.`);
    }

    const postedAt = new Date(postedAtRaw);
    if (Number.isNaN(postedAt.getTime())) {
      throw new Error(`Row ${index + 2} has an invalid date: ${postedAtRaw}`);
    }

    let amount = parseMoney(firstValue(row, amountKeys));

    if (amount === null) {
      const inflow = parseMoney(firstValue(row, inflowKeys));
      const outflow = parseMoney(firstValue(row, outflowKeys));

      if (inflow === null && outflow === null) {
        throw new Error(`Row ${index + 2} is missing an amount column.`);
      }

      amount = (inflow ?? 0) - (outflow ?? 0);
    }

    const direction = amount >= 0 ? "INCOME" : "EXPENSE";

    return {
      postedAt,
      description,
      merchant: merchant || null,
      category,
      amount,
      direction,
      raw: row,
    } as const;
  });
}

export function formatDateRange(start: Date | null | undefined, end: Date | null | undefined) {
  if (!start || !end) {
    return "No transactions imported";
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${formatter.format(start)} to ${formatter.format(end)}`;
}

export function buildTransactionSourceHash(input: {
  workspaceId: string;
  accountId: string;
  postedAt: Date;
  description: string;
  amount: number;
}) {
  const fingerprint = [
    input.workspaceId,
    input.accountId,
    input.postedAt.toISOString(),
    input.description.toLowerCase(),
    input.amount.toFixed(2),
  ].join("|");

  return createHash("sha256").update(fingerprint).digest("hex");
}

export function currencyAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}
