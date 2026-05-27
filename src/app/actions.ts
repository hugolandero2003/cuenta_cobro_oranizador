"use server";

import { revalidatePath } from "next/cache";
import { LoanStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function parseCopAmount(value: FormDataEntryValue | null, fieldName: string): number {
  const cleaned = String(value ?? "")
    .trim()
    .replaceAll(".", "")
    .replaceAll(",", "");

  const parsed = Number.parseInt(cleaned, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`El campo ${fieldName} debe ser un numero mayor a cero.`);
  }

  return parsed;
}

function parseFormDate(value: FormDataEntryValue | null, fieldName: string): Date {
  const raw = String(value ?? "").trim();
  if (!raw) {
    throw new Error(`El campo ${fieldName} es obligatorio.`);
  }

  // Store at noon UTC to avoid day shifts when rendered in local time zones.
  const parsed = new Date(`${raw}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`El campo ${fieldName} no tiene una fecha valida.`);
  }

  return parsed;
}

function normalizeClientName(value: FormDataEntryValue | null): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleUpperCase("es-CO");
}

export async function registerClientAction(formData: FormData): Promise<void> {
  const fullName = normalizeClientName(formData.get("fullName"));
  const idNumber = String(formData.get("idNumber") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!fullName || !idNumber) {
    throw new Error("Nombre y cedula son obligatorios.");
  }

  await prisma.client.upsert({
    where: { idNumber },
    create: {
      fullName,
      idNumber,
      phone: phone || null,
      address: address || null,
    },
    update: {
      fullName,
      phone: phone || null,
      address: address || null,
    },
  });

  revalidatePath("/");
}

export async function deleteClientAction(formData: FormData): Promise<void> {
  const clientIdRaw = String(formData.get("clientId") ?? "").trim();
  const clientId = Number.parseInt(clientIdRaw, 10);

  if (!Number.isInteger(clientId) || clientId <= 0) {
    throw new Error("Selecciona un cliente valido para eliminar.");
  }

  await prisma.client.delete({
    where: { id: clientId },
  });

  revalidatePath("/");
}

export async function createLoanAction(formData: FormData): Promise<void> {
  const fullName = normalizeClientName(formData.get("fullName"));
  const loanDate = parseFormDate(formData.get("loanDate"), "fecha del prestamo");
  const firstInstallmentDate = parseFormDate(formData.get("firstInstallmentDate"), "fecha de la primera cuota");
  const principalAmount = parseCopAmount(formData.get("principalAmount"), "valor prestado");
  const installmentAmountInput = parseCopAmount(formData.get("installmentAmount"), "valor de la cuota");
  const interestRateRaw = String(formData.get("interestRate") ?? "20").trim();
  const interestRate = Number.parseFloat(interestRateRaw);

  if (!fullName) {
    throw new Error("El nombre del cliente es obligatorio para crear el prestamo.");
  }

  if (!Number.isFinite(interestRate) || interestRate < 0) {
    throw new Error("La tasa de interes no puede ser negativa.");
  }

  const client =
    (await prisma.client.findFirst({
      where: { fullName },
      orderBy: { createdAt: "desc" },
    })) ??
    (await prisma.client.create({
      data: {
        fullName,
        idNumber: `AUTO-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      },
    }));

  if (client.fullName !== fullName) {
    await prisma.client.update({
      where: { id: client.id },
      data: { fullName },
    });
  }

  const totalAmount = Math.round(principalAmount * (1 + interestRate / 100));
  const installmentAmount = installmentAmountInput;
  const installmentsCount = Math.max(1, Math.ceil(totalAmount / installmentAmount));

  await prisma.loan.create({
    data: {
      clientId: client.id,
      principalAmount,
      interestRate,
      totalAmount,
      installmentsCount,
      installmentAmount,
      firstInstallmentDate,
      status: LoanStatus.ACTIVE,
      createdAt: loanDate,
    },
  });

  revalidatePath("/");
}

export async function registerPaymentAction(formData: FormData): Promise<void> {
  const loanIdRaw = String(formData.get("loanId") ?? "").trim();
  const loanId = Number.parseInt(loanIdRaw, 10);
  const paymentDate = parseFormDate(formData.get("paymentDate"), "fecha de pago");
  const amount = parseCopAmount(formData.get("amount"), "cuota pagada");
  const note = String(formData.get("note") ?? "").trim();

  if (!Number.isInteger(loanId) || loanId <= 0) {
    throw new Error("Selecciona un prestamo valido.");
  }

  await prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({
      where: { id: loanId },
      include: {
        payments: {
          select: { amount: true },
        },
      },
    });

    if (!loan) {
      throw new Error("Prestamo no encontrado.");
    }

    if (loan.status !== LoanStatus.ACTIVE) {
      throw new Error("Solo puedes registrar cuotas en prestamos activos.");
    }

    const currentPaid = loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const newPaid = currentPaid + amount;

    await tx.payment.create({
      data: {
        loanId,
        amount,
        note: note || null,
        paidAt: paymentDate,
      },
    });

    if (newPaid >= loan.totalAmount) {
      await tx.loan.update({
        where: { id: loanId },
        data: {
          status: LoanStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    }
  });

  revalidatePath("/");
}

export async function markCollectionAlertHandledAction(formData: FormData): Promise<void> {
  const loanIdRaw = String(formData.get("loanId") ?? "").trim();
  const dueInstallmentsRaw = String(formData.get("dueInstallments") ?? "").trim();
  const loanId = Number.parseInt(loanIdRaw, 10);
  const dueInstallments = Number.parseInt(dueInstallmentsRaw, 10);

  if (!Number.isInteger(loanId) || loanId <= 0) {
    throw new Error("Prestamo invalido para marcar alerta.");
  }

  if (!Number.isInteger(dueInstallments) || dueInstallments <= 0) {
    throw new Error("Numero de cuota invalido para marcar alerta.");
  }

  await prisma.loan.update({
    where: { id: loanId },
    data: {
      lastHandledDueInstallment: dueInstallments,
      lastHandledAt: new Date(),
    },
  });

  revalidatePath("/");
}
