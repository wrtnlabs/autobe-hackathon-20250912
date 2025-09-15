import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently erase a specific record amendment from a patient's medical
 * record.
 *
 * This operation allows a System Admin to irreversibly delete a record
 * amendment (from healthcare_platform_record_amendments) identified by its
 * unique ID, only if it belongs to the given patient record and if no active
 * legal/business hold is in place. It also logs the operation for compliance in
 * the audit log table.
 *
 * @param props - Operation parameters including:
 *
 *   - SystemAdmin: SystemadminPayload (authenticated system admin)
 *   - PatientRecordId: UUID of the patient record
 *   - RecordAmendmentId: UUID of the amendment to remove
 *
 * @returns Void
 * @throws {Error} If the amendment is not found or not linked to the patient
 *   record
 * @throws {Error} If an active legal/business hold is found for the patient
 *   record
 */
export async function deletehealthcarePlatformSystemAdminPatientRecordsPatientRecordIdRecordAmendmentsRecordAmendmentId(props: {
  systemAdmin: SystemadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  recordAmendmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Ensure the amendment exists and is linked to the correct patient record
  const amendment =
    await MyGlobal.prisma.healthcare_platform_record_amendments.findUnique({
      where: { id: props.recordAmendmentId },
      select: { id: true, patient_record_id: true },
    });
  if (!amendment || amendment.patient_record_id !== props.patientRecordId) {
    throw new Error(
      "Amendment not found or does not belong to the specified patient record",
    );
  }

  // Step 2: Check for active legal/business hold on this patient record
  const hold = await MyGlobal.prisma.healthcare_platform_legal_holds.findFirst({
    where: {
      subject_type: "patient_data",
      subject_id: props.patientRecordId,
      status: "active",
      deleted_at: null,
    },
    select: { id: true },
  });
  if (hold) {
    throw new Error(
      "Cannot erase: Active legal or business hold exists on patient record",
    );
  }

  // Step 3: Hard delete the amendment (irreversible)
  await MyGlobal.prisma.healthcare_platform_record_amendments.delete({
    where: { id: props.recordAmendmentId },
  });

  // Step 4: Write deletion event to audit log (regulatory compliance)
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: props.systemAdmin.id,
      organization_id: null,
      action_type: "DELETE_RECORD_AMENDMENT",
      event_context: null,
      ip_address: null,
      related_entity_type: "record_amendment",
      related_entity_id: props.recordAmendmentId,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
