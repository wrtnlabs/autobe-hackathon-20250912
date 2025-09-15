import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get full details of a specific record amendment on a patient record.
 *
 * This operation retrieves and returns all audit, approval, and amendment
 * metadata fields for a specific patient record amendment, identified by both
 * the patient record ID and record amendment ID. Only accessible by a
 * privileged system admin for platform-wide compliance and audit
 * investigation.
 *
 * The result includes amendment type, rationale, JSON-formatted old/new value
 * snapshots, submitter and reviewer information, approval status, timestamps,
 * and related EHR event if present. Returns 404 if not found or if IDs are
 * invalid. Does not allow reading across unrelated patient records.
 *
 * @param props - Input object containing:
 *
 *   - SystemAdmin: SystemadminPayload (privileged platform superuser)
 *   - PatientRecordId: UUID for the target patient record
 *   - RecordAmendmentId: UUID for the specific record amendment
 *
 * @returns IHealthcarePlatformRecordAmendment with all regulatory/audit fields
 *   populated
 * @throws Error if the record amendment is not found, or ID combination is
 *   invalid
 */
export async function gethealthcarePlatformSystemAdminPatientRecordsPatientRecordIdRecordAmendmentsRecordAmendmentId(props: {
  systemAdmin: SystemadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  recordAmendmentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformRecordAmendment> {
  const { patientRecordId, recordAmendmentId } = props;
  const amendment =
    await MyGlobal.prisma.healthcare_platform_record_amendments.findFirstOrThrow(
      {
        where: {
          id: recordAmendmentId,
          patient_record_id: patientRecordId,
        },
      },
    );

  return {
    id: amendment.id,
    patient_record_id: amendment.patient_record_id,
    submitted_by_user_id: amendment.submitted_by_user_id,
    reviewed_by_user_id: amendment.reviewed_by_user_id ?? undefined,
    ehr_encounter_id: amendment.ehr_encounter_id ?? undefined,
    amendment_type: amendment.amendment_type,
    old_value_json: amendment.old_value_json,
    new_value_json: amendment.new_value_json,
    rationale: amendment.rationale,
    approval_status: amendment.approval_status ?? undefined,
    created_at: toISOStringSafe(amendment.created_at),
  };
}
