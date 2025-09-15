import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrVersion";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Retrieve a specific EHR version snapshot for a patient encounter by version
 * number.
 *
 * This endpoint enables authorized nurses to fetch the complete structured data
 * for an individual EHR version for a patient, given a patient record ID,
 * encounter ID, and EHR version number. Nurses are only authorized to view EHR
 * versions for patients/encounters for which they are the provider or within
 * their assigned department/roster, per RBAC rules. All accesses must be logged
 * to the audit trail for compliance. Requests for unassigned patients or
 * non-existent versions result in a descriptive error. Only date-time string
 * types are used.
 *
 * @param props - Parameters for the request
 * @param props.nurse - The authenticated nurse making the request
 * @param props.patientRecordId - Unique ID of the patient record
 * @param props.encounterId - Unique ID of the EHR encounter
 * @param props.versionNumber - Sequence number of the EHR version to retrieve
 * @returns The complete EHR version snapshot object
 * @throws {Error} When the nurse is not authorized to access this encounter or
 *   record
 * @throws {Error} If the encounter, version, or record does not exist
 */
export async function gethealthcarePlatformNursePatientRecordsPatientRecordIdEncountersEncounterIdEhrVersionsVersionNumber(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  versionNumber: number & tags.Type<"int32">;
}): Promise<IHealthcarePlatformEhrVersion> {
  // 1. Find the EHR encounter and ensure it belongs to the requested patient record
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: props.encounterId,
        patient_record_id: props.patientRecordId,
      },
    });
  if (!encounter) {
    throw new Error(
      "EHR encounter not found or does not match the patient record",
    );
  }

  // 2. RBAC: Only allow access if the nurse is the provider for this encounter
  if (encounter.provider_user_id !== props.nurse.id) {
    throw new Error(
      "Unauthorized: You are not allowed to access this patient encounter",
    );
  }

  // 3. Fetch the requested EHR version for this encounter and version number
  const ehrVersion =
    await MyGlobal.prisma.healthcare_platform_ehr_versions.findFirst({
      where: {
        ehr_encounter_id: props.encounterId,
        version_number: props.versionNumber,
      },
    });
  if (!ehrVersion) {
    throw new Error(
      "EHR version not found for the specified encounter and version number",
    );
  }

  // 4. Log all accesses to audit trail for compliance
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: props.nurse.id,
      organization_id: undefined,
      action_type: "EHR_VERSION_VIEW",
      event_context: JSON.stringify({
        patient_record_id: props.patientRecordId,
        encounter_id: props.encounterId,
        version_number: props.versionNumber,
      }),
      ip_address: undefined,
      related_entity_type: "EHR_VERSION",
      related_entity_id: ehrVersion.id,
      created_at: toISOStringSafe(new Date()),
    },
  });

  // 5. Return mapped result according to DTO specification, strictly using date-time strings
  return {
    id: ehrVersion.id,
    ehr_encounter_id: ehrVersion.ehr_encounter_id,
    submitted_by_user_id: ehrVersion.submitted_by_user_id,
    version_number: ehrVersion.version_number,
    snapshot_json: ehrVersion.snapshot_json,
    reason_for_update: ehrVersion.reason_for_update ?? undefined,
    created_at: toISOStringSafe(ehrVersion.created_at),
  };
}
