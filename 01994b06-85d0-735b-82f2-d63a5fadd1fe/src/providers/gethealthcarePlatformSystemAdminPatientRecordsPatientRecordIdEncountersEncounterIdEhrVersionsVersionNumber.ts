import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrVersion";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a specific EHR version snapshot for a patient encounter by version
 * number.
 *
 * This endpoint enables authorized system administrators to fetch the complete
 * data for an individual EHR version, as identified by patient record ID,
 * encounter ID, and version number. Each EHR version reflects a point-in-time
 * clinical snapshot and records the rationale for any update. Strong validation
 * ensures the encounter belongs to the specified patient, and all necessary
 * business rules are enforced.
 *
 * All access is subject to role-based permissions and must be logged for
 * compliance (HIPAA, legal, and audit requirements). Not-found and unauthorized
 * access attempts result in explicit errors.
 *
 * @param props - Object containing all request properties
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the request
 * @param props.patientRecordId - UUID of the targeted patient record
 * @param props.encounterId - UUID of the EHR encounter to be checked
 * @param props.versionNumber - Sequence number of the EHR version to retrieve
 * @returns Complete EHR version snapshot for the given identifiers
 * @throws {Error} If verification fails or requested resource is not found
 */
export async function gethealthcarePlatformSystemAdminPatientRecordsPatientRecordIdEncountersEncounterIdEhrVersionsVersionNumber(props: {
  systemAdmin: SystemadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  versionNumber: number & tags.Type<"int32">;
}): Promise<IHealthcarePlatformEhrVersion> {
  const { systemAdmin, patientRecordId, encounterId, versionNumber } = props;

  // 1. Authorization is enforced by presence of systemAdmin (already validated upstream).

  // 2. Validate the encounter belongs to the specified patient record
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
      },
    });
  if (!encounter) {
    throw new Error(
      "Encounter does not exist, or does not belong to the specified patient record",
    );
  }

  // 3. Fetch the requested EHR version by encounter ID and version number.
  const version =
    await MyGlobal.prisma.healthcare_platform_ehr_versions.findFirst({
      where: {
        ehr_encounter_id: encounterId,
        version_number: versionNumber,
      },
    });

  if (!version) {
    throw new Error("EHR version number not found for this encounter");
  }

  // Optionally: log audit event here if audit log model/schema is available
  // (Not implemented due to schema context)

  return {
    id: version.id,
    ehr_encounter_id: version.ehr_encounter_id,
    submitted_by_user_id: version.submitted_by_user_id,
    version_number: version.version_number,
    snapshot_json: version.snapshot_json,
    reason_for_update:
      typeof version.reason_for_update === "string"
        ? version.reason_for_update
        : undefined,
    created_at: toISOStringSafe(version.created_at),
  };
}
