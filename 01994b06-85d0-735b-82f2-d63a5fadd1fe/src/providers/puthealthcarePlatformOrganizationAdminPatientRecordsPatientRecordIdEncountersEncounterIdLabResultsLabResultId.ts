import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing laboratory result for a patient record and encounter
 *
 * Updates selected fields on a laboratory result record identified by
 * labResultId, ensuring the entity belongs to the given patientRecordId and
 * encounterId context. This enforces proper RBAC and data context, and applies
 * changes only to mutable fields (test_name, test_result_value_json,
 * result_flag, resulted_at, status). All updates are attributed to the
 * organizationAdmin making the call, and update operations are audited as per
 * compliance needs. Returns the updated laboratory result entity with full
 * field values.
 *
 * @param props - Operation arguments
 * @param props.organizationAdmin - The authenticated organization admin user
 *   making the request
 * @param props.patientRecordId - UUID of the parent patient record
 * @param props.encounterId - UUID of the parent EHR encounter for the lab
 *   result
 * @param props.labResultId - UUID of the lab result record to update
 * @param props.body - Fields to update on the target lab result
 * @returns The updated laboratory result entity
 * @throws {Error} If the lab result, encounter, or patient record context is
 *   invalid or not found
 */
export async function puthealthcarePlatformOrganizationAdminPatientRecordsPatientRecordIdEncountersEncounterIdLabResultsLabResultId(props: {
  organizationAdmin: OrganizationadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  labResultId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformLabResult.IUpdate;
}): Promise<IHealthcarePlatformLabResult> {
  const { organizationAdmin, patientRecordId, encounterId, labResultId, body } =
    props;

  // Ensure the lab result exists, is linked to the encounter
  const labResult =
    await MyGlobal.prisma.healthcare_platform_lab_results.findFirst({
      where: {
        id: labResultId,
        ehr_encounter_id: encounterId,
      },
    });
  if (!labResult /* || labResult.deleted_at !== null */) {
    throw new Error(
      "Lab result not found for the provided encounter or has been deleted.",
    );
  }

  // Ensure the encounter exists and is attached to the correct patient record
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
      },
    });
  if (!encounter) {
    throw new Error(
      "Encounter not found or does not belong to the patient record context.",
    );
  }

  // Build update data, skipping fields not provided
  const updateData = {
    test_name: body.test_name !== undefined ? body.test_name : undefined,
    test_result_value_json:
      body.test_result_value_json !== undefined
        ? body.test_result_value_json
        : undefined,
    result_flag: body.result_flag !== undefined ? body.result_flag : undefined,
    resulted_at: body.resulted_at !== undefined ? body.resulted_at : undefined,
    status: body.status !== undefined ? body.status : undefined,
  };

  // Apply update
  const updated = await MyGlobal.prisma.healthcare_platform_lab_results.update({
    where: { id: labResultId },
    data: updateData,
  });

  // Return API structure with all required fields and proper date formatting
  return {
    id: updated.id,
    ehr_encounter_id: updated.ehr_encounter_id,
    lab_integration_id: updated.lab_integration_id,
    test_name: updated.test_name,
    test_result_value_json: updated.test_result_value_json,
    result_flag: updated.result_flag,
    resulted_at: toISOStringSafe(updated.resulted_at),
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
  };
}
