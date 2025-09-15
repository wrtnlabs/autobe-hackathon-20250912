import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Register a new patient user profile in healthcare_platform_patients.
 *
 * This endpoint allows an authenticated receptionist to onboard a new patient
 * into the healthcare platform system, capturing regulatory identity fields and
 * demographic attributes. The function ensures email uniqueness
 * (case-sensitive) prior to registration, and populates system audit fields for
 * compliance and workflow integration.
 *
 * The created patient profile is immutable, linked to subsequent appointments,
 * billing, and consent management workflows, and fully audit-ready for
 * regulatory requirements.
 *
 * Authorization: Receptionist role is required and validated upstream. Creation
 * is denied on duplicate email or invalid inputs.
 *
 * @param props - Invocation parameters
 * @param props.receptionist - Authenticated receptionist performing onboarding
 * @param props.body - Registration payload (email, full_name, date_of_birth[,
 *   phone])
 * @returns The newly created patient user profile with compliance-traceable
 *   timestamps
 * @throws {Error} If email already exists or business logic fails
 */
export async function posthealthcarePlatformReceptionistPatients(props: {
  receptionist: ReceptionistPayload;
  body: IHealthcarePlatformPatient.ICreate;
}): Promise<IHealthcarePlatformPatient> {
  const { body } = props;

  // Step 1: Ensure uniqueness (case-sensitive per business policy)
  const existing = await MyGlobal.prisma.healthcare_platform_patients.findFirst(
    {
      where: {
        email: body.email,
        deleted_at: null,
      },
    },
  );
  if (existing) {
    throw new Error("Patient with this email already exists");
  }

  // Step 2: Prepare system/audit timestamps (never use native Date type in type signatures)
  const now = toISOStringSafe(new Date());

  // Step 3: Insert patient record
  const created = await MyGlobal.prisma.healthcare_platform_patients.create({
    data: {
      id: v4(),
      email: body.email,
      full_name: body.full_name,
      date_of_birth: body.date_of_birth,
      phone:
        body.phone !== undefined && body.phone !== null ? body.phone : null,
      created_at: now,
      updated_at: now,
    },
  });

  // Step 4: Map DB response to API DTO, with correct null/undefined handling
  return {
    id: created.id,
    email: created.email,
    full_name: created.full_name,
    date_of_birth: toISOStringSafe(created.date_of_birth),
    phone: created.phone ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== undefined && created.deleted_at !== null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
