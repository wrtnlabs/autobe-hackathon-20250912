import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently deletes a laboratory result from a patient's encounter
 * (healthcare_platform_lab_results)
 *
 * This operation deletes a specific lab result associated with an encounter in
 * a patient's clinical record. It hard-deletes the row from the
 * healthcare_platform_lab_results table, removing it from compliance and data
 * analysis access. Strict audit and compliance logging is performed before the
 * action per regulations on PHI and laboratory data integrity. Deletions are
 * only permitted for authorized administrative users, and all actions are
 * recorded for audit/compliance purposes. The operation fails if the lab result
 * does not exist, is not correctly attached, or the record is under an active
 * legal hold.
 *
 * @param props - Parameters for the operation
 * @param props.organizationAdmin - The authenticated organization admin user
 *   (OrganizationadminPayload)
 * @param props.patientRecordId - Target patient record UUID (must exist in the
 *   system)
 * @param props.encounterId - Target EHR encounter UUID (must be attached to the
 *   patient record)
 * @param props.labResultId - Lab result UUID to delete (must be attached to the
 *   encounter)
 * @returns Void
 * @throws {Error} When lab result is not found, does not belong to the
 *   encounter/patient, user lacks permission, or the record is locked for
 *   compliance
 */
export async function deletehealthcarePlatformOrganizationAdminPatientRecordsPatientRecordIdEncountersEncounterIdLabResultsLabResultId(props: {
  organizationAdmin: OrganizationadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  labResultId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, patientRecordId, encounterId, labResultId } =
    props;

  // Locate lab result and check descending relation chain
  const labResult =
    await MyGlobal.prisma.healthcare_platform_lab_results.findFirst({
      where: { id: labResultId },
      select: {
        id: true,
        ehr_encounter_id: true,
      },
    });
  if (!labResult) throw new Error("Lab result not found.");

  // Fetch the encounter and verify match
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: { id: labResult.ehr_encounter_id },
      select: { id: true, patient_record_id: true },
    });
  if (!encounter)
    throw new Error("Lab result is not attached to a valid encounter.");
  if (encounter.id !== encounterId)
    throw new Error("Lab result does not belong to the specified encounter.");
  if (encounter.patient_record_id !== patientRecordId)
    throw new Error(
      "Lab result does not belong to the specified patient record.",
    );

  // Ensure no compliance/legal hold is active on patient record
  const legalHold =
    await MyGlobal.prisma.healthcare_platform_legal_holds.findFirst({
      where: {
        subject_type: "patient_data",
        subject_id: patientRecordId,
        status: "active",
      },
    });
  if (legalHold)
    throw new Error(
      "Cannot delete: patient record under active legal/compliance hold.",
    );

  // Audit trail: Record this destructive action
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_record_audit_trails.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      patient_record_id: patientRecordId,
      actor_user_id: organizationAdmin.id,
      audit_action: "lab_result_delete",
      created_at: now,
      request_reason: "Lab result deleted by organization admin via API.",
    },
  });

  // Hard delete the lab result
  await MyGlobal.prisma.healthcare_platform_lab_results.delete({
    where: { id: labResultId },
  });
  // Void: finish
}
