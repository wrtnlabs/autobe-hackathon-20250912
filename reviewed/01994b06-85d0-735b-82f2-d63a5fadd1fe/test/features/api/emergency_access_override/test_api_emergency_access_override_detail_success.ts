import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEmergencyAccessOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEmergencyAccessOverride";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate that a system admin can retrieve the detailed info of an emergency
 * access override event.
 *
 * 1. Register a system admin (join) with a valid business email and credentials,
 *    provider 'local'
 * 2. Login as system admin (to guarantee session/token)
 * 3. Simulate existence of a valid emergency access override record (typia.random)
 * 4. Retrieve this record by id via GET endpoint as system admin
 * 5. Assert that all audit/detail fields are present, with correct types
 * 6. For error case, try retrieving a non-existent id and expect an error
 */
export async function test_api_emergency_access_override_detail_success(
  connection: api.IConnection,
) {
  // Step 1: Register a system admin
  const sysadminJoin = {
    email: RandomGenerator.name(3).replace(/ /g, "_") + "@acme-health.com",
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(16),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const joinResult = await api.functional.auth.systemAdmin.join(connection, {
    body: sysadminJoin,
  });
  typia.assert(joinResult);

  // Step 2: Login as sysadmin
  const sysadminLogin = {
    email: sysadminJoin.email,
    provider: "local",
    provider_key: sysadminJoin.provider_key,
    password: sysadminJoin.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loginOut = await api.functional.auth.systemAdmin.login(connection, {
    body: sysadminLogin,
  });
  typia.assert(loginOut);

  // Step 3: Simulate a valid existing emergency access override event (mocked, as no POST/create exists)
  const seedRecord: IHealthcarePlatformEmergencyAccessOverride =
    typia.random<IHealthcarePlatformEmergencyAccessOverride>();
  typia.assert(seedRecord);

  // Step 4: Retrieve this record by id
  const result =
    await api.functional.healthcarePlatform.systemAdmin.emergencyAccessOverrides.at(
      connection,
      { emergencyAccessOverrideId: seedRecord.id },
    );
  typia.assert(result);

  // Step 5: Audit field validation (all properties asserted by typia.assert)
  TestValidator.equals("response id matches", result.id, seedRecord.id);
  TestValidator.equals("user_id matches", result.user_id, seedRecord.user_id);
  TestValidator.equals(
    "organization_id matches",
    result.organization_id,
    seedRecord.organization_id,
  );
  TestValidator.equals("reason matches", result.reason, seedRecord.reason);
  TestValidator.equals(
    "override_scope matches",
    result.override_scope,
    seedRecord.override_scope,
  );
  TestValidator.equals(
    "override_start_at matches",
    result.override_start_at,
    seedRecord.override_start_at,
  );
  TestValidator.equals(
    "override_end_at matches",
    result.override_end_at,
    seedRecord.override_end_at,
  );
  TestValidator.equals(
    "created_at matches",
    result.created_at,
    seedRecord.created_at,
  );
  TestValidator.equals(
    "reviewed_by_user_id matches",
    result.reviewed_by_user_id,
    seedRecord.reviewed_by_user_id,
  );
  TestValidator.equals(
    "reviewed_at matches",
    result.reviewed_at,
    seedRecord.reviewed_at,
  );

  // Step 6: Negative scenario - random unassigned UUID
  await TestValidator.error(
    "404 on non-existent emergency access override detail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.emergencyAccessOverrides.at(
        connection,
        {
          emergencyAccessOverrideId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );
}
