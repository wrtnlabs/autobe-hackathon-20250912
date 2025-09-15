import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Update an existing record amendment entry for a patient record
 *
 * Updates a specific amendment record for a given patient. Only the assigned
 * reviewer (department head) can update non-finalized amendments. Throws 404 if
 * amendment or patient does not exist, 403 if not authorized reviewer, 400 if
 * the amendment is finalized (approved or rejected). Returns the updated
 * amendment with all audit and workflow fields.
 *
 * @param props - Update operation input
 * @param props.departmentHead - The authenticated department head acting as
 *   reviewer
 * @param props.patientRecordId - ID of the patient record this amendment
 *   belongs to
 * @param props.recordAmendmentId - ID of the amendment to update
 * @param props.body - The amendment update data (PATCH-like, only provided
 *   fields applied)
 * @returns The updated amendment entity with audit/workflow fields
 * @throws {Error} If amendment or patient not found, not authorized, or
 *   finalized
 */
export async function puthealthcarePlatformDepartmentHeadPatientRecordsPatientRecordIdRecordAmendmentsRecordAmendmentId(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
  recordAmendmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformRecordAmendment.IUpdate;
}): Promise<IHealthcarePlatformRecordAmendment> {
  // 1. Fetch amendment by both id and patient_record_id for security
  const amendment =
    await MyGlobal.prisma.healthcare_platform_record_amendments.findFirst({
      where: {
        id: props.recordAmendmentId,
        patient_record_id: props.patientRecordId,
      },
    });
  if (!amendment) throw new Error("Amendment not found");

  // 2. Fetch the parent patient record; must be not soft-deleted
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: props.patientRecordId,
        deleted_at: null,
      },
    });
  if (!patientRecord) throw new Error("Patient record not found or deleted");

  // 3. Only allow updates by assigned reviewer
  if (amendment.reviewed_by_user_id !== props.departmentHead.id) {
    throw new Error("Forbidden: not the assigned reviewer");
  }

  // 4. Prevent updates to finalized amendments
  if (
    amendment.approval_status === "approved" ||
    amendment.approval_status === "rejected"
  ) {
    throw new Error("Cannot update a finalized amendment");
  }

  // 5. Build update data selectively from provided props.body fields
  const updateData: {
    amendment_type?: string;
    old_value_json?: string;
    new_value_json?: string;
    rationale?: string;
    approval_status?: string;
    reviewed_by_user_id?: string;
    ehr_encounter_id?: string;
  } = {};
  if (props.body.amendment_type !== undefined)
    updateData.amendment_type = props.body.amendment_type;
  if (props.body.old_value_json !== undefined)
    updateData.old_value_json = props.body.old_value_json;
  if (props.body.new_value_json !== undefined)
    updateData.new_value_json = props.body.new_value_json;
  if (props.body.rationale !== undefined)
    updateData.rationale = props.body.rationale;
  if (props.body.approval_status !== undefined)
    updateData.approval_status = props.body.approval_status;
  if (props.body.reviewed_by_user_id !== undefined)
    updateData.reviewed_by_user_id = props.body.reviewed_by_user_id;
  if (props.body.ehr_encounter_id !== undefined)
    updateData.ehr_encounter_id = props.body.ehr_encounter_id;

  // 6. Perform update
  const updated =
    await MyGlobal.prisma.healthcare_platform_record_amendments.update({
      where: { id: props.recordAmendmentId },
      data: updateData,
    });

  // 7. Return updated entity, properly formatted for API
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
