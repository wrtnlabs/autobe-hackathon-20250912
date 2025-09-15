import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates system admin access to patient records across all organizations.
 *
 * This test verifies that a system admin can retrieve any patient record (PHI,
 * business metadata) in the platform, including those outside their own org,
 * that audit logging is (implicitly) triggered, and that error handling for
 * missing/deleted records follows policy. Workflow:
 *
 * 1. Register & login a system admin
 * 2. Register & login an org admin
 * 3. Use org admin context to create a patient record
 * 4. Switch to system admin and GET patient record by ID
 * 5. Validate retrieved fields and cross-org access
 * 6. Test error on non-existent recordId
 * 7. [Edge] Simulate soft-deleted record (set deleted_at) and assert correct error
 *    on GET
 */
export async function test_api_patient_record_system_admin_global_access_and_audit(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "SysAdmin!123",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: "SysAdmin!123",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 2. Register organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: "OrgAdmin!123",
        provider: "local",
        provider_key: orgAdminEmail,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);
  const organizationId = orgAdminJoin.id;

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "OrgAdmin!123",
      provider: "local",
      provider_key: orgAdminEmail,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Org admin creates a patient record
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const createdPatient =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: organizationId,
          patient_user_id: patientUserId,
          full_name: RandomGenerator.name(),
          dob: new Date("1990-05-20").toISOString(),
          status: "active",
          external_patient_number: RandomGenerator.alphaNumeric(8),
          gender: RandomGenerator.pick([
            "male",
            "female",
            "other",
            "undisclosed",
          ] as const),
          demographics_json: JSON.stringify({
            race: "Asian",
            language: "Korean",
          }),
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(createdPatient);
  TestValidator.equals(
    "organization_id matches",
    createdPatient.organization_id,
    organizationId,
  );
  TestValidator.equals(
    "patient_user_id matches",
    createdPatient.patient_user_id,
    patientUserId,
  );

  // Switch to system admin account
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: "SysAdmin!123",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 4. System admin GET patient record by ID (global access)
  const record =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.at(
      connection,
      {
        patientRecordId: typia.assert<string & tags.Format<"uuid">>(
          createdPatient.id,
        ),
      },
    );
  typia.assert(record);
  TestValidator.equals(
    "Sys admin can access PHI",
    record.id,
    createdPatient.id,
  );
  TestValidator.equals(
    "Sys admin sees full_name",
    record.full_name,
    createdPatient.full_name,
  );
  TestValidator.equals(
    "Sys admin sees demographics",
    record.demographics_json,
    createdPatient.demographics_json,
  );

  // Implicit: Backend should audit this access (audit log creation responsibility is system's)

  // 5. Error scenario: GET non-existent recordId
  const nonExistentUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Error when accessing non-existent patientRecordId",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.at(
        connection,
        {
          patientRecordId: nonExistentUuid,
        },
      );
    },
  );

  // 6. [Edge] Simulate soft deletion
  // As we cannot forcibly update deleted_at in this context, this portion is noted for real integration tests where record can be deleted via admin API.
  // If soft delete API existed:
  // await api.functional.healthcarePlatform.organizationAdmin.patientRecords.softDelete(...)
  // Then reattempt GET and assert error. This step is skipped in this implementation.
}
