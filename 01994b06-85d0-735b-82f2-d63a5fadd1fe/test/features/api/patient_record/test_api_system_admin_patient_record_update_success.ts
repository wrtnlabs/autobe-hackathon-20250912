import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate successful update of patient record by a system administrator.
 *
 * 1. Register and authenticate as a system administrator (POST
 *    /auth/systemAdmin/join).
 * 2. Create a patient record (POST
 *    /healthcarePlatform/systemAdmin/patientRecords).
 * 3. Update mutable fields (department, demographics, full_name, etc) via PUT
 *    /healthcarePlatform/systemAdmin/patientRecords/{patientRecordId}.
 * 4. Verify update response reflects all changes and maintains data integrity
 *    (fields that were not updated are unchanged; updated fields match input).
 * 5. API should return a fully valid updated patient record (typia.assert type
 *    validation).
 */
export async function test_api_system_admin_patient_record_update_success(
  connection: api.IConnection,
) {
  // 1. Register as system administrator
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: RandomGenerator.alphabets(12),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: joinInput });
  typia.assert(admin);

  // 2. Create a patient record
  const createInput = {
    organization_id: typia.random<string>(),
    patient_user_id: typia.random<string>(),
    full_name: RandomGenerator.name(),
    dob: new Date().toISOString(),
    status: "active",
    // Optional fields
    department_id: typia.random<string>(),
    external_patient_number: RandomGenerator.alphaNumeric(10),
    gender: RandomGenerator.pick(["male", "female", "other"] as const),
    demographics_json: JSON.stringify({ language: "English" }),
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const originalRecord: IHealthcarePlatformPatientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      { body: createInput },
    );
  typia.assert(originalRecord);

  // 3. Prepare update fields (modify all mutable fields to new value)
  const updateInput = {
    department_id: typia.random<string>(),
    external_patient_number: RandomGenerator.alphaNumeric(8),
    full_name: RandomGenerator.name(),
    dob: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    gender: RandomGenerator.pick(["female", "male", "other"] as const),
    status: "inactive",
    demographics_json: JSON.stringify({ race: "Asian", language: "Korean" }),
    deleted_at: null,
  } satisfies IHealthcarePlatformPatientRecord.IUpdate;

  // 4. Update patient record
  const updated: IHealthcarePlatformPatientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.update(
      connection,
      {
        patientRecordId: originalRecord.id as string & tags.Format<"uuid">,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 5. Validate update success: all fields updated, others unchanged
  TestValidator.equals(
    "updated department_id",
    updated.department_id,
    updateInput.department_id,
  );
  TestValidator.equals(
    "updated external_patient_number",
    updated.external_patient_number,
    updateInput.external_patient_number,
  );
  TestValidator.equals(
    "updated full_name",
    updated.full_name,
    updateInput.full_name,
  );
  TestValidator.equals("updated dob", updated.dob, updateInput.dob);
  TestValidator.equals("updated gender", updated.gender, updateInput.gender);
  TestValidator.equals("updated status", updated.status, updateInput.status);
  TestValidator.equals(
    "updated demographics_json",
    updated.demographics_json,
    updateInput.demographics_json,
  );
  TestValidator.equals(
    "not deleted",
    updated.deleted_at,
    updateInput.deleted_at,
  );
  // Immutable fields remain unchanged
  TestValidator.equals(
    "organization_id is unchanged",
    updated.organization_id,
    originalRecord.organization_id,
  );
  TestValidator.equals(
    "patient_user_id is unchanged",
    updated.patient_user_id,
    originalRecord.patient_user_id,
  );
}
