"use server";

import { prisma } from "@/lib/prisma";
import { requireWorkspacePermission } from "@/lib/workspaces";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const VehicleSchema = z.object({
  nickname: z.string().min(1, "Nickname is required"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  trim: z.string().optional().nullable(),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  vin: z.string().optional().nullable(),
  photoUrl: z.string().url().optional().nullable().or(z.literal("")),
});

const LogEntrySchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  type: z.enum(["MOD", "REPAIR", "MAINTENANCE"]),
  title: z.string().min(2, "Title is required"),
  date: z.coerce.date(),
  description: z.string().max(2000).optional().nullable(),
  odometer: z
    .union([z.literal(""), z.coerce.number().int().min(0)])
    .optional()
    .transform((value) => (value === "" ? null : value ?? null)),
  cost: z
    .union([z.literal(""), z.coerce.number().min(0)])
    .optional()
    .transform((value) => (value === "" ? null : value ?? null)),
});

const PartSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  name: z.string().min(2, "Part name is required"),
  partNumber: z.string().max(120).optional().nullable(),
  status: z.enum(["INSTALLED", "WISHLIST", "REPLACED"]),
});

export async function addVehicle(formData: FormData) {
  const { user, workspace } = await requireWorkspacePermission("garage:write");
  
  const rawData = {
    nickname: formData.get("nickname"),
    make: formData.get("make"),
    model: formData.get("model"),
    trim: formData.get("trim"),
    year: formData.get("year"),
    vin: formData.get("vin"),
    photoUrl: formData.get("photoUrl"),
  };

  const validatedFields = VehicleSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  try {
    await prisma.vehicle.create({
      data: {
        ...validatedFields.data,
        workspaceId: workspace.id,
        ownerId: user.id,
      },
    });
    
    revalidatePath("/garage");
    return { success: true };
  } catch (error) {
    return { error: "Failed to create vehicle." };
  }
}

export async function deleteVehicle(vehicleId: string) {
  const { workspace } = await requireWorkspacePermission("garage:write");

  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        workspaceId: workspace.id,
      },
      select: { id: true },
    });

    if (!vehicle) {
      return { error: "Failed to delete vehicle." };
    }

    await prisma.vehicle.delete({
      where: { id: vehicle.id },
    });

    revalidatePath("/garage");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete vehicle." };
  }
}

export async function updateVehicle(formData: FormData) {
  const { workspace } = await requireWorkspacePermission("garage:write");

  const vehicleId = formData.get("vehicleId");

  if (typeof vehicleId !== "string" || vehicleId.length === 0) {
    return { error: "Vehicle not found." };
  }

  const rawData = {
    nickname: formData.get("nickname"),
    make: formData.get("make"),
    model: formData.get("model"),
    trim: formData.get("trim"),
    year: formData.get("year"),
    vin: formData.get("vin"),
    photoUrl: formData.get("photoUrl"),
  };

  const validatedFields = VehicleSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { error: "Please check the vehicle details and try again." };
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      workspaceId: workspace.id,
    },
    select: { id: true },
  });

  if (!vehicle) {
    return { error: "Vehicle not found." };
  }

  try {
    await prisma.vehicle.update({
      where: {
        id: vehicle.id,
      },
      data: {
        ...validatedFields.data,
        trim: validatedFields.data.trim || null,
        vin: validatedFields.data.vin || null,
        photoUrl: validatedFields.data.photoUrl || null,
      },
    });

    revalidatePath("/garage");
    revalidatePath(`/garage/${vehicle.id}`);
    return { success: true };
  } catch (error) {
    return { error: "Failed to update vehicle." };
  }
}

export async function addLogEntry(formData: FormData) {
  const { workspace } = await requireWorkspacePermission("garage:write");

  const rawData = {
    vehicleId: formData.get("vehicleId"),
    type: formData.get("type"),
    title: formData.get("title"),
    date: formData.get("date"),
    description: formData.get("description"),
    odometer: formData.get("odometer"),
    cost: formData.get("cost"),
  };

  const validatedFields = LogEntrySchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { error: "Please check the log entry form and try again." };
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: validatedFields.data.vehicleId,
      workspaceId: workspace.id,
    },
    select: { id: true },
  });

  if (!vehicle) {
    return { error: "Vehicle not found." };
  }

  try {
    await prisma.logEntry.create({
      data: {
        vehicleId: vehicle.id,
        type: validatedFields.data.type,
        title: validatedFields.data.title,
        date: validatedFields.data.date,
        description: validatedFields.data.description || null,
        odometer: validatedFields.data.odometer,
        cost: validatedFields.data.cost ?? undefined,
      },
    });

    revalidatePath("/garage");
    revalidatePath(`/garage/${vehicle.id}`);
    return { success: true };
  } catch (error) {
    return { error: "Failed to add log entry." };
  }
}

export async function addPart(formData: FormData) {
  const { workspace } = await requireWorkspacePermission("garage:write");

  const rawData = {
    vehicleId: formData.get("vehicleId"),
    name: formData.get("name"),
    partNumber: formData.get("partNumber"),
    status: formData.get("status"),
  };

  const validatedFields = PartSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { error: "Please check the part form and try again." };
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: validatedFields.data.vehicleId,
      workspaceId: workspace.id,
    },
    select: { id: true },
  });

  if (!vehicle) {
    return { error: "Vehicle not found." };
  }

  try {
    await prisma.part.create({
      data: {
        vehicleId: vehicle.id,
        name: validatedFields.data.name,
        partNumber: validatedFields.data.partNumber || null,
        status: validatedFields.data.status,
      },
    });

    revalidatePath("/garage");
    revalidatePath(`/garage/${vehicle.id}`);
    return { success: true };
  } catch (error) {
    return { error: "Failed to save part." };
  }
}
