import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Update details of an existing EHR encounter for a patient record.
 *
 * This API endpoint allows an authorized department head to amend or update an
 * existing EHR encounter for a patient record. The operation validates the
 * encounter is active (not completed/cancelled/deleted), verifies context, and
 * applies any supplied amendments atomically. All date/datetime fields are
 * consistently handled as ISO 8601 strings (string & tags.Format<'date-time'>).
 * Field updates are strictly limited to those provided in the request body; no
 * type assertions used.
 *
 * @param props - Properties for the request, including authentication, path
 *   parameters, and update body.
 * @param props.departmentHead - The authenticated department head performing
 *   the update.
 * @param props.patientRecordId - The patient record this encounter belongs to.
 * @param props.encounterId - The unique identifier for the encounter being
 *   updated.
 * @param props.body - Update shape specifying which fields to change.
 * @returns The updated EHR encounter as a DTO, including all dates as string &
 *   tags.Format<'date-time'>.
 * @throws {Error} If the encounter does not exist, is deleted, or is not
 *   modifiable by business rules.
 */
export async function puthealthcarePlatformDepartmentHeadPatientRecordsPatientRecordIdEncountersEncounterId(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEhrEncounter.IUpdate;
}): Promise<IHealthcarePlatformEhrEncounter> {
  const { departmentHead, patientRecordId, encounterId, body } = props;

  // Fetch the encounter strictly by encounterId and patientRecordId, and only if not deleted
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
        deleted_at: null,
      },
    });
  if (encounter === null) {
    throw new Error("Encounter not found");
  }

  // Business rule: Completed or cancelled encounters may not be altered
  if (encounter.status === "completed" || encounter.status === "cancelled") {
    throw new Error("Cannot modify completed or cancelled encounters");
  }

  // Prepare update object (only set keys present on body)
  // No use of as/type assertions, only conditional inclusion
  const updates: {
    encounter_type?: string;
    encounter_start_at?: string & tags.Format<"date-time">;
    encounter_end_at?: (string & tags.Format<"date-time">) | null;
    status?: string;
    notes?: string | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
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
    updated_at: toISOStringSafe(new Date()),
  };

  // Perform the update
  const updated =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.update({
      where: { id: encounterId },
      data: updates,
    });

  return {
    id: updated.id,
    patient_record_id: updated.patient_record_id,
    provider_user_id: updated.provider_user_id,
    encounter_type: updated.encounter_type,
    encounter_start_at: toISOStringSafe(updated.encounter_start_at),
    encounter_end_at:
      updated.encounter_end_at != null
        ? toISOStringSafe(updated.encounter_end_at)
        : null,
    status: updated.status,
    notes: updated.notes !== undefined ? updated.notes : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at != null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
