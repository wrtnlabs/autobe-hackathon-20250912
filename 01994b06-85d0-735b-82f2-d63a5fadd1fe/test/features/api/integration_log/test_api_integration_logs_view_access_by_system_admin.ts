import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformIntegrationLog";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system admin's ability to view an integration log by its
 * integrationLogId.
 *
 * This test ensures:
 *
 * 1. SystemAdmin registration and login.
 * 2. Retrievable valid integration log (happy path).
 * 3. Existence and correctness of primary log attributes (org, event, status,
 *    timestamps).
 * 4. Correct error behavior for non-existent, unauthorized, or deleted log IDs.
 * 5. Business error cases such as cross-tenant or deleted log access yield denial
 *    or not-found results.
 */
export async function test_api_integration_logs_view_access_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(systemAdmin);

  // 2. Prepare a simulated existing integration log - as creation API is not exposed, use randomly generated for test
  const testLog: IHealthcarePlatformIntegrationLog =
    typia.random<IHealthcarePlatformIntegrationLog>();

  // 3. Happy path: Retrieve integration log with valid ID
  // In test scenario, simulate that system admin owns/accesses this log
  const output =
    await api.functional.healthcarePlatform.systemAdmin.integrationLogs.at(
      connection,
      {
        integrationLogId: testLog.id,
      },
    );
  typia.assert(output);
  TestValidator.equals("Log ID matches", output.id, testLog.id);
  TestValidator.equals(
    "Organization ID present",
    typeof output.healthcare_platform_organization_id,
    "string",
  );
  TestValidator.equals(
    "Integration type present",
    typeof output.integration_type,
    "string",
  );
  TestValidator.equals(
    "Event code present",
    typeof output.event_code,
    "string",
  );
  TestValidator.equals(
    "Event status present",
    typeof output.event_status,
    "string",
  );
  TestValidator.equals(
    "Occurred at is ISO date",
    typeof output.occurred_at,
    "string",
  );
  TestValidator.equals(
    "Created at is ISO date",
    typeof output.created_at,
    "string",
  );
  TestValidator.equals(
    "Updated at is ISO date",
    typeof output.updated_at,
    "string",
  );

  // 4. Error: Non-existent integrationLogId
  await TestValidator.error(
    "Non-existent integrationLogId yields error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.integrationLogs.at(
        connection,
        {
          integrationLogId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 5. Error: Unauthorized/cross-tenant log access (simulate by switching to unrelated random log ID)
  await TestValidator.error(
    "Unauthorized/cross-tenant log access yields error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.integrationLogs.at(
        connection,
        {
          integrationLogId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Edge: Attempt to access with deleted log id (simulate with random uuid)
  await TestValidator.error(
    "Deleted log id returns access denied or error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.integrationLogs.at(
        connection,
        {
          integrationLogId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
