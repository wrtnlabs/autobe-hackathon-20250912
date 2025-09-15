import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Register a new patient user profile in healthcare_platform_patients.
 *
 * This operation creates a new patient account with required demographic and
 * identity information (email, full name, date_of_birth), supporting compliance
 * and auditability. Ensures email uniqueness, assigns generated UUID and
 * timestamps, and aligns all return values to IHealthcarePlatformPatient
 * requirements (all date-times as branded ISO strings).
 *
 * Only authenticated organization admins can invoke this operation. Errors are
 * thrown for duplicate emails or missing data. Downstream workflows
 * (appointments, consents, billing) depend on the created patient profile as
 * root entity.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization admin issuing
 *   the registration
 * @param props.body - The patient registration payload per
 *   IHealthcarePlatformPatient.ICreate
 * @returns The fully-registered patient profile (IHealthcarePlatformPatient)
 * @throws {Error} When email already exists or on system/database error
 */
export async function posthealthcarePlatformOrganizationAdminPatients(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformPatient.ICreate;
}): Promise<IHealthcarePlatformPatient> {
  const { body } = props;

  // Validate uniqueness of email (ignore soft-deleted)
  const alreadyExists =
    await MyGlobal.prisma.healthcare_platform_patients.findFirst({
      where: {
        email: body.email,
        deleted_at: null,
      },
    });
  if (alreadyExists) throw new Error("Patient email already exists");

  // Prepare generated fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;

  // Insert patient record
  const patient = await MyGlobal.prisma.healthcare_platform_patients.create({
    data: {
      id,
      email: body.email,
      full_name: body.full_name,
      date_of_birth: body.date_of_birth,
      // phone is optional, may be undefined or null
      phone:
        body.phone !== undefined && body.phone !== null
          ? body.phone
          : undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Map to DTO, enforce type strictly, never use Date or as
  return {
    id: patient.id,
    email: patient.email,
    full_name: patient.full_name,
    date_of_birth: patient.date_of_birth,
    // phone: may be undefined or null, as per DTO
    phone: patient.phone ?? undefined,
    created_at: patient.created_at,
    updated_at: patient.updated_at,
    // Soft-delete marker, nullable (must match IHealthcarePlatformPatient)
    deleted_at: patient.deleted_at ?? null,
  };
}
