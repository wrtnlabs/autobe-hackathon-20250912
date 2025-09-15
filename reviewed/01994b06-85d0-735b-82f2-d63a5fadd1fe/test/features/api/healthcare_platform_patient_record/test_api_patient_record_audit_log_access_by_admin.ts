import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformRecordAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAuditTrail";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test scenario: Admin can access an audit log entry for a patient record
 * correctly, and error/permission logic is enforced. This test also
 * acknowledges the limitation that, due to missing API for triggering/listing
 * audit logs, it only verifies endpoint mechanics, not functional recording.
 *
 * 1. Register system admin and authenticate.
 * 2. Create a patient record.
 * 3. Attempt to retrieve a record audit entry for that patient record, using a
 *    random audit trail id.
 * 4. Ensure the endpoint works for valid input and responds to invalid input and
 *    unauthenticated requests with an error (but does NOT verify actual
 *    business audit logic, which cannot be tested with available APIs/DTOs).
 */
export async function test_api_patient_record_audit_log_access_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: adminPassword,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;

  const adminAuth: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: adminJoin });
  typia.assert(adminAuth);

  // Session (login as admin) even though join returns token
  const adminLogin = {
    email: adminEmail,
    provider: "local",
    provider_key: adminEmail,
    password: adminPassword,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const adminAuth2: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: adminLogin,
    });
  typia.assert(adminAuth2);

  // 2. Create a patient record
  const patientRecordInput = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    patient_user_id: typia.random<string & tags.Format<"uuid">>(),
    full_name: RandomGenerator.name(),
    dob: new Date().toISOString(),
    status: "active",
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patientRecord: IHealthcarePlatformPatientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      { body: patientRecordInput },
    );
  typia.assert(patientRecord);

  // 3. Retrieve a record audit trail entry using random id (since real linkage cannot be tested)
  const randomAuditTrailId = typia.random<string & tags.Format<"uuid">>();
  const auditEntry =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAuditTrails.at(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        recordAuditTrailId: randomAuditTrailId,
      },
    );
  typia.assert(auditEntry);
  TestValidator.equals(
    "audit log entry: patient_record_id matches",
    auditEntry.patient_record_id,
    patientRecord.id as string & tags.Format<"uuid">,
  );

  // 4. Use invalid audit id (another random id), expect error
  await TestValidator.error(
    "retrieval with invalid recordAuditTrailId should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAuditTrails.at(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          recordAuditTrailId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 5. Unauthenticated access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access is denied", async () => {
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAuditTrails.at(
      unauthConn,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        recordAuditTrailId: randomAuditTrailId,
      },
    );
  });
}
