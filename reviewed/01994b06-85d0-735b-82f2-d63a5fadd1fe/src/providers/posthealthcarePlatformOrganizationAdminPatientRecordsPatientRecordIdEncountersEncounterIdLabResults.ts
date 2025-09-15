import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new laboratory result for a specific encounter and patient record.
 *
 * This operation allows clinical, technical, or administrative staff to record
 * a new laboratory result associated with a given EHR encounter and patient
 * record. It enforces linkage between the encounter and the specified patient
 * record, ensures correct attribution of the result to an existing encounter,
 * and stores all relevant metadata, flags, value JSON, status, and lab provider
 * linkage. Date and UUID handling are performed using ISO-8601 strings and
 * generated UUIDs, never using native Date or type assertions. All outputs
 * strictly conform to the DTO and business logic, with explicit validation and
 * error handling for association and existence.
 *
 * @param props - Properties including the authenticated organizationAdmin,
 *   patientRecordId, encounterId, and required request body fields
 * @param props.organizationAdmin - The authenticated admin user injecting
 *   context/authorization
 * @param props.patientRecordId - Target patient record UUID this result should
 *   belong to
 * @param props.encounterId - The specific EHR encounter UUID this result is for
 * @param props.body - Request body containing all lab result fields (except
 *   id/created_at which are generated here)
 * @returns The complete, created IHealthcarePlatformLabResult object as stored,
 *   with all fields set and correctly formatted
 * @throws {Error} If the encounter does not exist, is deleted, or does not
 *   belong to the specified patient record
 */
export async function posthealthcarePlatformOrganizationAdminPatientRecordsPatientRecordIdEncountersEncounterIdLabResults(props: {
  organizationAdmin: OrganizationadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformLabResult.ICreate;
}): Promise<IHealthcarePlatformLabResult> {
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: props.encounterId,
        deleted_at: null,
      },
    });
  if (encounter === null) {
    throw new Error("Encounter not found or deleted");
  }
  if (encounter.patient_record_id !== props.patientRecordId) {
    throw new Error(
      "This encounter does not belong to the specified patient record",
    );
  }
  // Dates as string & tags.Format<'date-time'> only
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.healthcare_platform_lab_results.create({
    data: {
      id: v4(),
      ehr_encounter_id: props.encounterId,
      lab_integration_id: props.body.lab_integration_id,
      test_name: props.body.test_name,
      test_result_value_json: props.body.test_result_value_json,
      result_flag: props.body.result_flag,
      resulted_at: props.body.resulted_at,
      status: props.body.status,
      created_at: now,
    },
  });
  // Prisma returns Date for resulted_at and created_at, must convert both
  return {
    id: created.id,
    ehr_encounter_id: created.ehr_encounter_id,
    lab_integration_id: created.lab_integration_id,
    test_name: created.test_name,
    test_result_value_json: created.test_result_value_json,
    result_flag: created.result_flag,
    resulted_at: toISOStringSafe(created.resulted_at),
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
  };
}
