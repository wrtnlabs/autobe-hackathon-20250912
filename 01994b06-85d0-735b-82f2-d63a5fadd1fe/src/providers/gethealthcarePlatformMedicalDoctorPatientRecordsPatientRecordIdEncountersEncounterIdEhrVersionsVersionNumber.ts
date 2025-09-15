import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrVersion";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Retrieve a specific EHR version snapshot for a patient encounter by version
 * number.
 *
 * This endpoint enables authorized medical doctors to fetch the complete data
 * for an individual EHR version, as identified by patient record ID, encounter
 * ID, and version number. Each EHR version captures point-in-time clinical and
 * justification information. Strict authorization and access control are
 * enforced: only the doctor who provided the encounter (provider_user_id) can
 * access the related versions, and all access is logged for regulatory
 * compliance.
 *
 * @param props - Contains the authenticated doctor's payload, targeted patient
 *   record ID, encounter ID, and version number.
 * @returns The full EHR version snapshot object strictly matching the
 *   IHealthcarePlatformEhrVersion type.
 * @throws {Error} If the specified version does not exist or is not linked to
 *   the doctor, or if access is forbidden.
 */
export async function gethealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdEncountersEncounterIdEhrVersionsVersionNumber(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  versionNumber: number;
}): Promise<IHealthcarePlatformEhrVersion> {
  const { medicalDoctor, patientRecordId, encounterId, versionNumber } = props;

  // Find EHR version with encounter - match encounterId, version, and patient record linkage
  const ehrVersion =
    await MyGlobal.prisma.healthcare_platform_ehr_versions.findFirst({
      where: {
        ehr_encounter_id: encounterId,
        version_number: versionNumber,
      },
      include: {
        ehrEncounter: true, // includes patient_record_id and provider_user_id
      },
    });

  // Ensure the version exists for the given patient record & encounter
  if (
    !ehrVersion ||
    !ehrVersion.ehrEncounter ||
    ehrVersion.ehrEncounter.patient_record_id !== patientRecordId
  ) {
    throw new Error(
      "EHR version not found for this patient encounter/version.",
    );
  }

  // Authorization: Only the encounter's providing doctor can access
  if (ehrVersion.ehrEncounter.provider_user_id !== medicalDoctor.id) {
    throw new Error(
      "Forbidden: You cannot access another provider’s EHR version.",
    );
  }

  // Log access to audit trail for regulatory compliance
  await MyGlobal.prisma.healthcare_platform_record_audit_trails.create({
    data: {
      id: v4(),
      patient_record_id: ehrVersion.ehrEncounter.patient_record_id,
      actor_user_id: medicalDoctor.id,
      audit_action: "read_ehr_version",
      event_context_json: JSON.stringify({
        ehrEncId: encounterId,
        version: versionNumber,
      }),
      before_state_json: null,
      after_state_json: null,
      request_reason: "EHR version detail fetch",
      created_at: toISOStringSafe(new Date()),
    },
  });

  // Return the version detail using strictly formatted and correctly-branded types
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
