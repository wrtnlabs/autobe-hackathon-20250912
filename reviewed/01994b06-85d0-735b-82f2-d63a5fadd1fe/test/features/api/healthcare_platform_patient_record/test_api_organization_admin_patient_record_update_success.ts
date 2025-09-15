import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * End-to-end scenario where an authenticated organization admin successfully
 * updates an existing patient record.
 *
 * Steps:
 *
 * 1. Register organization admin and authenticate
 * 2. Create new patient record
 * 3. Build an update object (change patient name, status, demographics,
 *    department)
 * 4. Call update endpoint
 * 5. Validate update response has expected changes and updated audit fields
 */
export async function test_api_organization_admin_patient_record_update_success(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const orgAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: orgAdminJoinBody,
    },
  );
  typia.assert(orgAdmin);

  // 2. Create new patient record
  const createPatientBody = {
    organization_id: orgAdmin.id,
    // No department provided initially (optional and can be updated later)
    patient_user_id: typia.random<string & tags.Format<"uuid">>(),
    external_patient_number: RandomGenerator.alphaNumeric(8),
    full_name: RandomGenerator.name(),
    dob: new Date(Date.now() - 864000000000).toISOString(), // birthday far in the past
    gender: RandomGenerator.pick(["male", "female", "unspecified"] as const),
    status: "active",
    demographics_json: JSON.stringify({ race: "asian", language: "ko" }),
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const createdPatient =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      { body: createPatientBody },
    );
  typia.assert(createdPatient);

  // 3. Build update object (modifying several fields)
  const newFullName = RandomGenerator.name();
  const newStatus = RandomGenerator.pick([
    "inactive",
    "deceased",
    "transferred",
  ] as const);
  const newDepartmentId = typia.random<string & tags.Format<"uuid">>();
  const newDemographics = JSON.stringify({
    race: "white",
    language: "en",
    ethnicity: "non-hispanic",
  });
  const newMRN = RandomGenerator.alphaNumeric(9);
  const updateBody = {
    department_id: newDepartmentId,
    full_name: newFullName,
    status: newStatus,
    demographics_json: newDemographics,
    external_patient_number: newMRN,
  } satisfies IHealthcarePlatformPatientRecord.IUpdate;

  // 4. Update endpoint call
  const updated =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.update(
      connection,
      {
        patientRecordId: createdPatient.id as string & tags.Format<"uuid">,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 5. Validate update response
  TestValidator.equals(
    "updated record id should match",
    updated.id,
    createdPatient.id,
  );
  TestValidator.equals(
    "department_id updated",
    updated.department_id,
    newDepartmentId,
  );
  TestValidator.equals("status updated", updated.status, newStatus);
  TestValidator.equals("full_name updated", updated.full_name, newFullName);
  TestValidator.equals(
    "demographics_json updated",
    updated.demographics_json,
    newDemographics,
  );
  TestValidator.equals(
    "external_patient_number updated",
    updated.external_patient_number,
    newMRN,
  );

  // Audit fields
  TestValidator.predicate(
    "updated_at should be after or not equal to previous",
    new Date(updated.updated_at) >= new Date(createdPatient.updated_at),
  );
  // Unchanged fields
  TestValidator.equals(
    "organization_id unchanged",
    updated.organization_id,
    createdPatient.organization_id,
  );
  TestValidator.equals(
    "patient_user_id unchanged",
    updated.patient_user_id,
    createdPatient.patient_user_id,
  );
  TestValidator.equals("dob unchanged", updated.dob, createdPatient.dob);
}
