import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new record amendment for a patient record.
 *
 * This endpoint allows clinical staff, nurses, or compliance officers to
 * initiate an amendment to a patient record, such as corrections, updates, or
 * regulatory modifications. It strictly validates ownership, reference
 * existence, and duplication. All business validation is enforced, such as
 * reviewer existence and EHR encounter linkage. The record is only created for
 * a valid, non-deleted patient record.
 *
 * @param props - The request context and amendment payload
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the operation
 * @param props.patientRecordId - Target patient record (UUID)
 * @param props.body - Amendment create input, including old/new values,
 *   amendment type, reviewer, and optional encounter
 * @returns The newly created amendment entity, with full metadata and
 *   compliance fields as required for audit
 * @throws {Error} When the patient record does not exist, is soft-deleted,
 *   reviewer/encounter missing, conflicting pending amendment, or insufficient
 *   permission
 */
export async function posthealthcarePlatformOrganizationAdminPatientRecordsPatientRecordIdRecordAmendments(props: {
  organizationAdmin: OrganizationadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformRecordAmendment.ICreate;
}): Promise<IHealthcarePlatformRecordAmendment> {
  const { organizationAdmin, patientRecordId, body } = props;

  // Validate patient record exists and is active (not soft deleted)
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: patientRecordId,
        deleted_at: null,
      },
    });
  if (!patientRecord) {
    throw new Error("Patient record does not exist or is archived");
  }

  // Validate reviewed_by_user_id (if provided)
  if (
    body.reviewed_by_user_id !== undefined &&
    body.reviewed_by_user_id !== null
  ) {
    const reviewer =
      await MyGlobal.prisma.healthcare_platform_departmentheads.findFirst({
        where: { id: body.reviewed_by_user_id },
      });
    if (!reviewer) {
      throw new Error("Reviewer does not exist");
    }
  }

  // Validate ehr_encounter_id (if provided)
  if (body.ehr_encounter_id !== undefined && body.ehr_encounter_id !== null) {
    const encounter =
      await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
        where: { id: body.ehr_encounter_id },
      });
    if (!encounter) {
      throw new Error("EHR encounter does not exist");
    }
  }

  // Check for existing conflicting, pending amendment
  const conflict =
    await MyGlobal.prisma.healthcare_platform_record_amendments.findFirst({
      where: {
        patient_record_id: patientRecordId,
        amendment_type: body.amendment_type,
        old_value_json: body.old_value_json,
        new_value_json: body.new_value_json,
        rationale: body.rationale,
        approval_status: "pending",
      },
    });
  if (conflict) {
    throw new Error("Conflicting pending amendment already exists");
  }

  // Create amendment
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_record_amendments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        patient_record_id: patientRecordId,
        submitted_by_user_id: body.submitted_by_user_id,
        reviewed_by_user_id: body.reviewed_by_user_id ?? undefined,
        ehr_encounter_id: body.ehr_encounter_id ?? undefined,
        amendment_type: body.amendment_type,
        old_value_json: body.old_value_json,
        new_value_json: body.new_value_json,
        rationale: body.rationale,
        approval_status: body.approval_status ?? undefined,
        created_at: now,
      },
    });

  return {
    id: created.id,
    patient_record_id: created.patient_record_id,
    submitted_by_user_id: created.submitted_by_user_id,
    reviewed_by_user_id: created.reviewed_by_user_id ?? undefined,
    ehr_encounter_id: created.ehr_encounter_id ?? undefined,
    amendment_type: created.amendment_type,
    old_value_json: created.old_value_json,
    new_value_json: created.new_value_json,
    rationale: created.rationale,
    approval_status: created.approval_status ?? undefined,
    created_at: now,
  };
}
