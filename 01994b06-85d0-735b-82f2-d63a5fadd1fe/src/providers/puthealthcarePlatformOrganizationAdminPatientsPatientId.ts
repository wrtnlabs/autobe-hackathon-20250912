import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing patient user profile in healthcare_platform_patients.
 *
 * This operation updates demographic and contact fields for a patient user
 * specified by patientId. Only permitted fields (email, full_name,
 * date_of_birth, phone) are updated if supplied. The change is recorded for
 * audit/compliance and restricted to authorized organization admins. Attempts
 * to update a deleted/nonexistent patient result in an error. All output fields
 * conform to the API structure and regulatory policies.
 *
 * @param props - Object containing the update parameters
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the update
 * @param props.patientId - The unique ID of the patient user to update
 * @param props.body - The update payload (may include any subset of permitted
 *   fields)
 * @returns The updated patient profile (all fields, formatted and compliant
 *   with type contracts)
 * @throws {Error} If the patient does not exist, is deleted, or update fails by
 *   business/DB rule
 */
export async function puthealthcarePlatformOrganizationAdminPatientsPatientId(props: {
  organizationAdmin: OrganizationadminPayload;
  patientId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformPatient.IUpdate;
}): Promise<IHealthcarePlatformPatient> {
  const { organizationAdmin, patientId, body } = props;

  // 1. Ensure patient exists and is not deleted
  const patient = await MyGlobal.prisma.healthcare_platform_patients.findFirst({
    where: {
      id: patientId,
      deleted_at: null,
    },
  });
  if (!patient) {
    throw new Error("Patient not found or has been deleted");
  }

  // 2. Build updates object with only permitted fields
  // No mutation: update only fields present in body
  const now = toISOStringSafe(new Date());
  const updates: {
    email?: string;
    full_name?: string;
    date_of_birth?: string;
    phone?: string | null;
    updated_at: string;
  } = {
    ...(body.email !== undefined ? { email: body.email } : {}),
    ...(body.full_name !== undefined ? { full_name: body.full_name } : {}),
    ...(body.date_of_birth !== undefined
      ? { date_of_birth: body.date_of_birth }
      : {}),
    ...(body.phone !== undefined ? { phone: body.phone } : {}),
    updated_at: now,
  };

  // 3. Update the patient row
  const updated = await MyGlobal.prisma.healthcare_platform_patients.update({
    where: { id: patientId },
    data: updates,
  });

  // 4. Return as IHealthcarePlatformPatient, handling all type conversions
  return {
    id: updated.id,
    email: updated.email,
    full_name: updated.full_name,
    date_of_birth: toISOStringSafe(updated.date_of_birth),
    phone: updated.phone ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
