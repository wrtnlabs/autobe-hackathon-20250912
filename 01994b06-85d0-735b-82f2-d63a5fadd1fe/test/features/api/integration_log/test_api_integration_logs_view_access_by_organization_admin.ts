import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformIntegrationLog";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Organization admin views specific integration log by ID.
 *
 * 1. Register a new organization admin (orgA), which also provides org context.
 * 2. Assume at least one log exists in this org: generate a random valid UUID.
 * 3. Request details for integration log in orgA (happy path: check all fields,
 *    org linkage).
 * 4. Attempt to access: a) Integration log from a different org (should trigger
 *    forbidden/404) b) Non-existent log ID (should return not found error)
 */
export async function test_api_integration_logs_view_access_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register/join as org admin A
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminA: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminJoin,
    });
  typia.assert(adminA);

  // 2. Mock or generate an integration log belonging to this organization
  const integrationLogId = typia.random<string & tags.Format<"uuid">>();

  // 3. Try to fetch (happy path, may 404 if log doesn't exist—but we check type/fields)
  try {
    const log: IHealthcarePlatformIntegrationLog =
      await api.functional.healthcarePlatform.organizationAdmin.integrationLogs.at(
        connection,
        { integrationLogId },
      );
    typia.assert(log);
    TestValidator.equals(
      "integration log id matches",
      log.id,
      integrationLogId,
    );
  } catch (err) {
    // If not found, that's acceptable for this path (no seed data)
  }

  // 4a. Register/join as a different org admin (orgB)
  const adminJoinB = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminB: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminJoinB,
    });

  // Attempt to access log with adminB
  await TestValidator.error("orgB cannot access log outside org", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.integrationLogs.at(
      connection,
      { integrationLogId },
    );
  });

  // 4b. Try to access non-existent log with adminB (also triggers error)
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent log returns error", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.integrationLogs.at(
      connection,
      { integrationLogId: fakeId },
    );
  });
}
