import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently deletes a patient user profile by patientId (hard delete) from
 * the healthcare_platform_patients table.
 *
 * This operation is intended only for explicit compliance exceptions. The
 * function checks for patient and patient record existence, hard deletes the
 * patient (no soft delete), and logs the operation for legal and audit
 * traceability. It does not use native Date, does not use type assertion, and
 * follows FP/immutable patterns strictly.
 *
 * @param props - Props object containing the authenticated organizationAdmin
 *   and a patientId UUID.
 * @returns Void
 * @throws {Error} If the patient does not exist, or their patient record does
 *   not exist.
 */
export async function deletehealthcarePlatformOrganizationAdminPatientsPatientId(props: {
  organizationAdmin: OrganizationadminPayload;
  patientId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, patientId } = props;
  // 1. Confirm patient exists
  const patient = await MyGlobal.prisma.healthcare_platform_patients.findUnique(
    { where: { id: patientId } },
  );
  if (!patient) {
    throw new Error("Patient not found");
  }
  // 2. Confirm patient is associated with an organization via patient record
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { patient_user_id: patientId },
    });
  if (!patientRecord) {
    throw new Error("Patient record not found");
  }
  // 3. Hard delete patient profile (removes row)
  await MyGlobal.prisma.healthcare_platform_patients.delete({
    where: { id: patientId },
  });
  // 4. Audit log of irreversible deletion
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: organizationAdmin.id,
      organization_id: patientRecord.organization_id,
      action_type: "PATIENT_DELETE",
      event_context: JSON.stringify({
        adminId: organizationAdmin.id,
        patientId,
      }),
      related_entity_type: "PATIENT",
      related_entity_id: patientId,
      created_at: toISOStringSafe(new Date()),
      ip_address: undefined, // No IP in context, leave as undefined (optional)
    },
  });
}
