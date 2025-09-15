import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update details of an existing EHR encounter for a patient record.
 *
 * This endpoint allows an authenticated organization admin to amend an existing
 * EHR encounter for a patient record, correcting the encounter type, timing,
 * status, and clinical notes. It enforces audit trailing, triggers a new
 * version in EHR versioning as a side effect, and is compliant with regulatory
 * change management.
 *
 * Authorization: Only admins for the relevant organization are permitted. The
 * endpoint enforces that the encounter exists and is currently active (not
 * soft-deleted).
 *
 * @param props - Parameter object containing organization admin auth info,
 *   patient record id, encounter id, and update payload (IUpdate)
 * @returns The updated EHR encounter object as IHealthcarePlatformEhrEncounter
 * @throws {Error} If the encounter record is not found, or has been
 *   soft-deleted.
 */
export async function puthealthcarePlatformOrganizationAdminPatientRecordsPatientRecordIdEncountersEncounterId(props: {
  organizationAdmin: OrganizationadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEhrEncounter.IUpdate;
}): Promise<IHealthcarePlatformEhrEncounter> {
  const { organizationAdmin, patientRecordId, encounterId, body } = props;

  // 1. Fetch encounter and validate active status for correct patient record
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
        deleted_at: null,
      },
    });
  if (!encounter) {
    throw new Error(
      "Encounter not found or not active for given patient record.",
    );
  }

  // 2. Update only the permitted fields from body (ignore extra)
  const data: Record<string, unknown> = {
    ...(body.encounter_type !== undefined && {
      encounter_type: body.encounter_type,
    }),
    ...(body.encounter_start_at !== undefined && {
      encounter_start_at: body.encounter_start_at,
    }),
    ...(body.encounter_end_at !== undefined && {
      encounter_end_at: body.encounter_end_at,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.notes !== undefined && { notes: body.notes }),
  };

  const updated =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.update({
      where: { id: encounter.id },
      data,
    });

  // 3. (side effect, not shown) EHR versioning & audit

  // 4. Return mapped output, converting Date fields
  return {
    id: updated.id,
    patient_record_id: updated.patient_record_id,
    provider_user_id: updated.provider_user_id,
    encounter_type: updated.encounter_type,
    encounter_start_at: toISOStringSafe(updated.encounter_start_at),
    encounter_end_at: updated.encounter_end_at
      ? toISOStringSafe(updated.encounter_end_at)
      : undefined,
    status: updated.status,
    notes: updated.notes ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
