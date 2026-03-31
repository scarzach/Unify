"use server";

import { parseCsvTransactions, buildTransactionSourceHash, resolveTransactionCategory } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { requireWorkspacePermission } from "@/lib/workspaces";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024;

function stringValue(value: FormDataEntryValue | null, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export async function importFinancialCsv(formData: FormData) {
  const { user, workspace } = await requireWorkspacePermission("finance:import");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirect("/saas?error=missing-file");
  }

  if (file.size > MAX_CSV_SIZE_BYTES) {
    redirect("/saas?error=file-too-large");
  }

  const sourceLabel = stringValue(formData.get("sourceLabel"), "Manual bank import");
  const accountName = stringValue(formData.get("accountName"), "Primary account");
  const institution = stringValue(formData.get("institution"), sourceLabel);
  const accountType = stringValue(formData.get("accountType"), "CHECKING");

  let parsedTransactions;

  try {
    parsedTransactions = parseCsvTransactions(await file.text());
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "Unable to parse the uploaded CSV.";
    redirect(`/saas?error=parse-failed&message=${message}`);
  }

  const connectionType = accountType as "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "CASH" | "OTHER";

  const existingConnection = await prisma.financialConnection.findFirst({
    where: {
      workspaceId: workspace.id,
      provider: "MANUAL_IMPORT",
      label: sourceLabel,
      institution,
    },
    include: {
      accounts: true,
    },
  });

  const connection =
    existingConnection ??
    (await prisma.financialConnection.create({
      data: {
        workspaceId: workspace.id,
        ownerId: user.id,
        provider: "MANUAL_IMPORT",
        label: sourceLabel,
        institution,
        lastSyncedAt: new Date(),
      },
      include: {
        accounts: true,
      },
    }));

  let account = connection.accounts.find((item) => item.name === accountName);

  if (!account) {
    account = await prisma.financialAccount.create({
      data: {
        workspaceId: workspace.id,
        ownerId: user.id,
        connectionId: connection.id,
        name: accountName,
        institutionName: institution,
        type: connectionType,
      },
    });
  }

  const transactionRows = parsedTransactions.map((transaction) => ({
    workspaceId: workspace.id,
    ownerId: user.id,
    accountId: account.id,
    postedAt: transaction.postedAt,
    description: transaction.description,
    merchant: transaction.merchant,
    category: resolveTransactionCategory({
      description: transaction.description,
      merchant: transaction.merchant,
      category: transaction.category,
      amount: transaction.amount,
      direction: transaction.direction,
    }),
    amount: transaction.amount,
    direction: transaction.direction,
    sourceHash: buildTransactionSourceHash({
      workspaceId: workspace.id,
      accountId: account.id,
      postedAt: transaction.postedAt,
      description: transaction.description,
      amount: transaction.amount,
    }),
    rawSource: transaction.raw,
  }));

  const uniqueTransactionRows = Array.from(
    new Map(transactionRows.map((transaction) => [transaction.sourceHash, transaction])).values(),
  );
  const duplicateCountInUpload = transactionRows.length - uniqueTransactionRows.length;

  const existingTransactions = uniqueTransactionRows.length
    ? await prisma.financialTransaction.findMany({
        where: {
          workspaceId: workspace.id,
          sourceHash: {
            in: uniqueTransactionRows.map((transaction) => transaction.sourceHash),
          },
        },
        select: {
          sourceHash: true,
        },
      })
    : [];

  const existingSourceHashes = new Set(existingTransactions.map((transaction) => transaction.sourceHash));
  const newTransactionRows = uniqueTransactionRows.filter(
    (transaction) => !existingSourceHashes.has(transaction.sourceHash),
  );
  const duplicateCount =
    duplicateCountInUpload + (uniqueTransactionRows.length - newTransactionRows.length);

  if (newTransactionRows.length > 0) {
    await prisma.financialTransaction.createMany({
      data: newTransactionRows,
      skipDuplicates: true,
    });
  }

  await prisma.financialConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: new Date() },
  });

  revalidatePath("/dashboard");
  revalidatePath("/saas");
  redirect(`/saas?status=imported&count=${newTransactionRows.length}&duplicates=${duplicateCount}`);
}

export async function clearFinancialData() {
  const { workspace } = await requireWorkspacePermission("finance:clear");

  await prisma.$transaction([
    prisma.financialTransaction.deleteMany({
      where: { workspaceId: workspace.id },
    }),
    prisma.financialAccount.deleteMany({
      where: { workspaceId: workspace.id },
    }),
    prisma.financialConnection.deleteMany({
      where: { workspaceId: workspace.id },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/saas");
  redirect("/saas?status=cleared");
}
