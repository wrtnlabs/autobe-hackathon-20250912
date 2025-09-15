import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates system admin permanent deletion of patient record including error
 * surface and idempotency.
 *
 * The scenario covers:
 *
 * 1. Register and authenticate a system admin user
 * 2. Create a test patient record
 * 3. System admin deletes the patient record (hard delete)
 * 4. Attempt to delete the record again (expect error for idempotency) (No read
 *    endpoint available to validate disappearance; test limited to delete API
 *    checks.)
 */
export async function test_api_system_admin_patient_record_delete_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a system admin
  const sysAdminIn = {
    email: `${RandomGenerator.alphaNumeric(8)}@business.com`,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;

  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminIn,
  });
  typia.assert(sysAdmin);

  // 2. Create a test patient record
  const createPatientBody = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    patient_user_id: typia.random<string & tags.Format<"uuid">>(),
    full_name: RandomGenerator.name(),
    dob: new Date("1991-01-01T09:00:00Z").toISOString(),
    status: "active",
  } satisfies IHealthcarePlatformPatientRecord.ICreate;

  const patient =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      { body: createPatientBody },
    );
  typia.assert(patient);
  TestValidator.equals(
    "created patient name matches",
    patient.full_name,
    createPatientBody.full_name,
  );

  // 3. System admin deletes the patient record (hard delete)
  await api.functional.healthcarePlatform.systemAdmin.patientRecords.erase(
    connection,
    { patientRecordId: patient.id as string & tags.Format<"uuid"> },
  );

  // 4. Attempt to delete the record again - expect error for idempotency
  await TestValidator.error(
    "idempotent repeated delete yields error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.erase(
        connection,
        { patientRecordId: patient.id as string & tags.Format<"uuid"> },
      );
    },
  );

  // Note: No GET/read endpoint exists to try fetching the deleted record. Test is limited to delete behavior/negative scenario checks.
}
