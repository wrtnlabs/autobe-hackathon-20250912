import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently delete a specific EHR version for a patient encounter (hard
 * delete, audit/compliance only).
 *
 * This endpoint allows an authorized system administrator to permanently remove
 * a specific EHR version (immutable clinical snapshot) from the
 * healthcare_platform_ehr_versions table. This operation is strictly limited to
 * compliance or regulatory scenarios, not for normal workflow usage. It uses
 * hard delete, as the model does not support soft deletion. All actions are
 * fully audited for compliance.
 *
 * @param props - Properties required for deletion
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the operation
 * @param props.patientRecordId - UUID of the parent patient record (for
 *   validation)
 * @param props.encounterId - UUID of the parent EHR encounter
 * @param props.versionNumber - The version number within the encounter to
 *   delete
 * @returns Void
 * @throws {Error} If the EHR version is not found, the encounter does not match
 *   the patient record, or the user is not authorized
 */
export async function deletehealthcarePlatformSystemAdminPatientRecordsPatientRecordIdEncountersEncounterIdEhrVersionsVersionNumber(props: {
  systemAdmin: SystemadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  versionNumber: number;
}): Promise<void> {
  const { systemAdmin, patientRecordId, encounterId, versionNumber } = props;

  // Authorization check - explicit for clarity (redundant if decorator enforces, but maintainable)
  if (systemAdmin.type !== "systemAdmin") {
    throw new Error("Forbidden: Insufficient privileges");
  }

  // 1. Lookup the EHR version by encounterId + versionNumber
  const ehrVersion =
    await MyGlobal.prisma.healthcare_platform_ehr_versions.findFirst({
      where: {
        ehr_encounter_id: encounterId,
        version_number: versionNumber,
      },
    });

  if (!ehrVersion) {
    throw new Error("EHR version not found");
  }

  // 2. Confirm the encounter exists and belongs to specified patient record
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: ehrVersion.ehr_encounter_id,
      },
    });

  if (!encounter || encounter.patient_record_id !== patientRecordId) {
    throw new Error("EHR version not found");
  }

  // 3. Hard delete the EHR version (no soft delete field exists)
  await MyGlobal.prisma.healthcare_platform_ehr_versions.delete({
    where: {
      id: ehrVersion.id,
    },
  });

  // 4. Create an audit log recording the delete event
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: systemAdmin.id,
      organization_id: null,
      action_type: "EHR_VERSION_DELETE",
      event_context: JSON.stringify({
        ehr_encounter_id: ehrVersion.ehr_encounter_id,
        version_number: ehrVersion.version_number,
        deleted_ehr_version_id: ehrVersion.id,
      }),
      ip_address: undefined,
      related_entity_type: "EHR_VERSION",
      related_entity_id: ehrVersion.id,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
