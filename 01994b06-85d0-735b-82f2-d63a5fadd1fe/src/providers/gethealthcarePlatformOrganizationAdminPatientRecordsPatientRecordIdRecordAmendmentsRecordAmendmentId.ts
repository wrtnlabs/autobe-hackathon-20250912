import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get full details of a specific record amendment on a patient record
 *
 * This operation retrieves the full details of a specific record amendment for
 * a patient record, identified by both the patient record ID and record
 * amendment ID. It enforces that the amendment belongs to the specified
 * patient, and the patient record belongs to the organization the admin
 * manages. RBAC and data isolation are strictly enforced to protect PHI and
 * audit compliance. Returns all audit, approval, and content fields for
 * regulatory and business workflow needs.
 *
 * @param props - Object containing authorization and path parameters
 * @param props.organizationAdmin - OrganizationadminPayload for the
 *   authenticated org admin
 * @param props.patientRecordId - UUID of the patient record in question
 * @param props.recordAmendmentId - UUID of the record amendment to retrieve
 * @returns IHealthcarePlatformRecordAmendment with full audit and content
 *   fields for the amendment
 * @throws {Error} 404 if the amendment does not exist for this patient record
 * @throws {Error} 403 if the admin does not control this organization's record
 */
export async function gethealthcarePlatformOrganizationAdminPatientRecordsPatientRecordIdRecordAmendmentsRecordAmendmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  recordAmendmentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformRecordAmendment> {
  const { organizationAdmin, patientRecordId, recordAmendmentId } = props;

  // Find the amendment matching both keys, will throw 404 if not found
  const amendment =
    await MyGlobal.prisma.healthcare_platform_record_amendments.findFirstOrThrow(
      {
        where: {
          id: recordAmendmentId,
          patient_record_id: patientRecordId,
        },
      },
    );

  // Find the associated patient record to enforce RBAC (tenant isolation)
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirstOrThrow({
      where: { id: amendment.patient_record_id },
      select: { organization_id: true },
    });

  // RBAC: The org admin may only access records in their own organization
  if (organizationAdmin.id !== patientRecord.organization_id) {
    throw new Error(
      "Forbidden: You do not have access to this patient's record amendment.",
    );
  }

  // Map fields directly, converting created_at to ISO string format
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
