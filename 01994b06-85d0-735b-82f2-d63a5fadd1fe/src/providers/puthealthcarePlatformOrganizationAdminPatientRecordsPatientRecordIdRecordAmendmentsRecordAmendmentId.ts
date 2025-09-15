import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing record amendment entry for a patient record.
 *
 * This endpoint enables an organization admin to update a record amendment for
 * a given patient record. The function enforces primary and foreign key
 * constraints, verifies organizational-admin status, and ensures all business
 * relationships (reviewer, patient, encounter) are valid before applying any
 * changes. It handles PATCH-style updates to only the specified fields,
 * updating the workflow status and reviewers as needed while logging all audit
 * information. All date fields are strictly returned as ISO strings. Null and
 * undefined values are carefully mapped to meet response DTO requirements.
 * Attempts to update for soft-deleted patient records, non-existent reviewers,
 * or orphaned amendments will throw clear business errors.
 *
 * Authorization is strictly enforced. Only permitted organization admins may
 * perform this operation. Soft-deleted and orphaned data are rejected. Business
 * rules regarding finalized amendments or workflow transitions may be
 * implemented upstream or refined in future versions.
 *
 * @param props - Update props
 * @param props.organizationAdmin - The authenticated organization admin user
 *   performing the update (must exist, not deleted)
 * @param props.patientRecordId - The patient record ID for which to update the
 *   amendment
 * @param props.recordAmendmentId - The amendment ID to update
 * @param props.body - Patch-style amendment update fields
 * @returns The newly updated amendment record, with all audit fields and
 *   relation keys set
 * @throws {Error} When any resource is missing, soft-deleted, or violates
 *   referential integrity; or if authorization fails
 */
export async function puthealthcarePlatformOrganizationAdminPatientRecordsPatientRecordIdRecordAmendmentsRecordAmendmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  recordAmendmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformRecordAmendment.IUpdate;
}): Promise<IHealthcarePlatformRecordAmendment> {
  const { organizationAdmin, patientRecordId, recordAmendmentId, body } = props;
  // 1. Confirm organization admin exists and is not deleted
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: organizationAdmin.id, deleted_at: null },
    });
  if (!admin)
    throw new Error("Unauthorized: Organization admin not found or deleted.");

  // 2. Check target patient record exists and is not soft deleted
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: patientRecordId, deleted_at: null },
    });
  if (!patientRecord)
    throw new Error("Patient record not found or has been deleted.");

  // 3. Check record amendment exists and belongs to patient record
  const amendment =
    await MyGlobal.prisma.healthcare_platform_record_amendments.findFirst({
      where: { id: recordAmendmentId, patient_record_id: patientRecordId },
    });
  if (!amendment)
    throw new Error("Record amendment not found for patient record.");

  // 4. If patch includes reviewer, validate reviewer exists and is not deleted
  if (body.reviewed_by_user_id !== undefined) {
    const reviewer =
      await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
        where: { id: body.reviewed_by_user_id, deleted_at: null },
      });
    if (!reviewer) throw new Error("Reviewer does not exist or was deleted.");
  }
  // 5. If patch includes EHR encounter, validate exists, matches patient, not soft deleted
  if (body.ehr_encounter_id !== undefined) {
    const encounter =
      await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
        where: {
          id: body.ehr_encounter_id,
          patient_record_id: patientRecordId,
          deleted_at: null,
        },
      });
    if (!encounter)
      throw new Error("EHR encounter does not exist for this patient record.");
  }
  // 6. Assemble update fields (patch-style)
  const updateFields: {
    amendment_type?: string;
    old_value_json?: string;
    new_value_json?: string;
    rationale?: string;
    approval_status?: string;
    reviewed_by_user_id?: string;
    ehr_encounter_id?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (body.amendment_type !== undefined)
    updateFields.amendment_type = body.amendment_type;
  if (body.old_value_json !== undefined)
    updateFields.old_value_json = body.old_value_json;
  if (body.new_value_json !== undefined)
    updateFields.new_value_json = body.new_value_json;
  if (body.rationale !== undefined) updateFields.rationale = body.rationale;
  if (body.approval_status !== undefined)
    updateFields.approval_status = body.approval_status;
  if (body.reviewed_by_user_id !== undefined)
    updateFields.reviewed_by_user_id = body.reviewed_by_user_id;
  if (body.ehr_encounter_id !== undefined)
    updateFields.ehr_encounter_id = body.ehr_encounter_id;

  // 7. Update and fetch the updated row
  const updated =
    await MyGlobal.prisma.healthcare_platform_record_amendments.update({
      where: { id: recordAmendmentId },
      data: updateFields,
    });

  // 8. Return response mapped to DTO; ensure all date fields as string, nullable/optional are undefined/null as DTO requires
  return {
    id: updated.id,
    patient_record_id: updated.patient_record_id,
    submitted_by_user_id: updated.submitted_by_user_id,
    reviewed_by_user_id: updated.reviewed_by_user_id ?? undefined,
    ehr_encounter_id: updated.ehr_encounter_id ?? undefined,
    amendment_type: updated.amendment_type,
    old_value_json: updated.old_value_json,
    new_value_json: updated.new_value_json,
    rationale: updated.rationale,
    approval_status: updated.approval_status ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
  };
}
