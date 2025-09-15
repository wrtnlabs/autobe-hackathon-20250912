import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a detailed laboratory result by ID for a given patient record and
 * encounter.
 *
 * This operation returns the complete laboratory result record from the
 * platform, ensuring it is scoped correctly by organization, patient record,
 * and encounter. All necessary authorization and isolation checks are
 * performed. DateTime fields are returned ISO-formatted as `string &
 * tags.Format<'date-time'>` strictly without any use of native Date in code or
 * types.
 *
 * @param props - Object containing:
 *
 *   - OrganizationAdmin: OrganizationadminPayload (JWT-authenticated admin
 *       principal)
 *   - PatientRecordId: string & tags.Format<'uuid'> (parent patient record)
 *   - EncounterId: string & tags.Format<'uuid'> (parent EHR encounter)
 *   - LabResultId: string & tags.Format<'uuid'> (unique lab result)
 *
 * @returns IHealthcarePlatformLabResult object for the lab result, if found and
 *   authorized.
 * @throws {Error} If any record in the reference chain is missing or access is
 *   denied (not found/unauthorized).
 */
export async function gethealthcarePlatformOrganizationAdminPatientRecordsPatientRecordIdEncountersEncounterIdLabResultsLabResultId(props: {
  organizationAdmin: OrganizationadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  labResultId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformLabResult> {
  const { organizationAdmin, patientRecordId, encounterId, labResultId } =
    props;

  // 1. Validate organization admin is not deleted
  const orgAdmin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: organizationAdmin.id },
    });
  if (!orgAdmin) throw new Error("Not found or not authorized");

  // 2. Patient record must be active
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: patientRecordId },
    });
  if (!patientRecord) throw new Error("Patient record not found");

  // 3. Org admin must be assigned to this org
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id: patientRecord.organization_id,
      },
    });
  if (!orgAssignment) throw new Error("Access denied or no assignment");

  // 4. Validate encounter exists, is active, and corresponds to patient record
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
      },
    });
  if (!encounter) throw new Error("Encounter not found");

  // 5. Validate lab result belongs to this encounter
  const labResult =
    await MyGlobal.prisma.healthcare_platform_lab_results.findFirst({
      where: {
        id: labResultId,
        ehr_encounter_id: encounterId,
      },
    });
  if (!labResult) throw new Error("Lab result not found");

  // 6. Map result to DTO with strict type conformance, explicit date formatting
  return {
    id: labResult.id,
    ehr_encounter_id: labResult.ehr_encounter_id,
    lab_integration_id: labResult.lab_integration_id,
    test_name: labResult.test_name,
    test_result_value_json: labResult.test_result_value_json,
    result_flag: labResult.result_flag,
    resulted_at: toISOStringSafe(labResult.resulted_at),
    status: labResult.status,
    created_at: toISOStringSafe(labResult.created_at),
  };
}
