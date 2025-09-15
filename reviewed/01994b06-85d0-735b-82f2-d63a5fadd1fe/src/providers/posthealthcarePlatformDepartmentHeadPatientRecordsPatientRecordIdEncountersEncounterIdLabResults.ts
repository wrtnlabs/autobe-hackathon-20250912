import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Create a new laboratory result for a specific encounter and patient record.
 *
 * This endpoint enables authorized users (department heads) to create a
 * laboratory result under a specified clinical encounter and patient record
 * within the system. The lab result is stored in the
 * healthcare_platform_lab_results table, including linkage to the lab provider
 * integration, core test/result details, and all compliance metadata.
 *
 * @param props - Parameters for lab result creation.
 * @param props.departmentHead - Authenticated DepartmentheadPayload
 *   (authorization required)
 * @param props.patientRecordId - UUID of the patient record to link the lab
 *   result
 * @param props.encounterId - UUID of the EHR encounter where this result is
 *   attached
 * @param props.body - Request body containing all fields required to create a
 *   lab result
 * @returns The created IHealthcarePlatformLabResult entity, fully populated
 * @throws {Error} If any referenced entities (encounter, integration) do not
 *   exist or other database errors occur
 */
export async function posthealthcarePlatformDepartmentHeadPatientRecordsPatientRecordIdEncountersEncounterIdLabResults(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformLabResult.ICreate;
}): Promise<IHealthcarePlatformLabResult> {
  const created = await MyGlobal.prisma.healthcare_platform_lab_results.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ehr_encounter_id: props.encounterId,
      lab_integration_id: props.body.lab_integration_id,
      test_name: props.body.test_name,
      test_result_value_json: props.body.test_result_value_json,
      result_flag: props.body.result_flag,
      resulted_at: toISOStringSafe(props.body.resulted_at),
      status: props.body.status,
      created_at: toISOStringSafe(new Date()),
    },
  });
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
