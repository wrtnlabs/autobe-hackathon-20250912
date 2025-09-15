import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Create a new record amendment for a patient record.
 *
 * This endpoint allows authorized department heads to create new
 * audit/compliance amendments to patient clinical records, such as corrections
 * or updates, linked to an optional EHR encounter and optional reviewer. All
 * business, regulatory, and audit validations are enforced, including duplicate
 * detection and reference validation. Returns the newly created amendment
 * object.
 *
 * Security: Only departmentHead role can perform this operation. Invalid
 * references (patient record, encounter, or reviewer) and duplicates will
 * result in errors.
 *
 * @param props - Request parameter object.
 * @param props.departmentHead - The authenticated department head user
 *   (authentication enforced at route/middleware).
 * @param props.patientRecordId - UUID (string & tags.Format<'uuid'>) for the
 *   target patient record.
 * @param props.body - The amendment creation payload, fully validated.
 * @returns The created IHealthcarePlatformRecordAmendment.
 * @throws {Error} When patient record, encounter, or reviewer is not found or
 *   is soft-deleted.
 * @throws {Error} On business rule violation (duplicate/amendment conflict,
 *   etc).
 */
export async function posthealthcarePlatformDepartmentHeadPatientRecordsPatientRecordIdRecordAmendments(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformRecordAmendment.ICreate;
}): Promise<IHealthcarePlatformRecordAmendment> {
  // 1. Validate patient record exists and active
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: props.patientRecordId,
        deleted_at: null,
      },
    });
  if (!patientRecord) {
    throw new Error("Patient record not found or is deleted");
  }

  // 2. Validate EHR encounter, if present
  if (
    props.body.ehr_encounter_id !== undefined &&
    props.body.ehr_encounter_id !== null
  ) {
    const encounter =
      await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
        where: {
          id: props.body.ehr_encounter_id,
          deleted_at: null,
        },
      });
    if (!encounter) {
      throw new Error("EHR encounter not found or is deleted");
    }
  }

  // 3. Validate reviewer department head, if present
  if (
    props.body.reviewed_by_user_id !== undefined &&
    props.body.reviewed_by_user_id !== null
  ) {
    const reviewer =
      await MyGlobal.prisma.healthcare_platform_departmentheads.findFirst({
        where: {
          id: props.body.reviewed_by_user_id,
          deleted_at: null,
        },
      });
    if (!reviewer) {
      throw new Error("Reviewer department head not found or is deleted");
    }
  }

  // 4. Duplicate/conflict check
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_record_amendments.findFirst({
      where: {
        patient_record_id: props.body.patient_record_id,
        amendment_type: props.body.amendment_type,
        ehr_encounter_id: props.body.ehr_encounter_id ?? null,
        rationale: props.body.rationale,
        old_value_json: props.body.old_value_json,
        new_value_json: props.body.new_value_json,
        approval_status: props.body.approval_status ?? null,
      },
    });
  if (duplicate) {
    throw new Error(
      "Duplicate/conflicting amendment exists for record/type/encounter",
    );
  }

  // 5. Insert new amendment
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_record_amendments.create({
      data: {
        id: v4(),
        patient_record_id: props.body.patient_record_id,
        submitted_by_user_id: props.body.submitted_by_user_id,
        reviewed_by_user_id: props.body.reviewed_by_user_id ?? null,
        ehr_encounter_id: props.body.ehr_encounter_id ?? null,
        amendment_type: props.body.amendment_type,
        old_value_json: props.body.old_value_json,
        new_value_json: props.body.new_value_json,
        rationale: props.body.rationale,
        approval_status: props.body.approval_status ?? null,
        created_at: now,
      },
    });

  // 6. Map nullable DB fields to DTO optional+nullable undefined/null contract
  return {
    id: created.id,
    patient_record_id: created.patient_record_id,
    submitted_by_user_id: created.submitted_by_user_id,
    reviewed_by_user_id:
      created.reviewed_by_user_id === null
        ? undefined
        : created.reviewed_by_user_id,
    ehr_encounter_id:
      created.ehr_encounter_id === null ? undefined : created.ehr_encounter_id,
    amendment_type: created.amendment_type,
    old_value_json: created.old_value_json,
    new_value_json: created.new_value_json,
    rationale: created.rationale,
    approval_status:
      created.approval_status === null ? undefined : created.approval_status,
    created_at: created.created_at,
  };
}
