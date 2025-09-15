import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBenchmarkDefinition";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * System admin can get benchmark definition details by benchmarkId, including
 * organization-linked fields and metadata. Errors: not found if id doesn't
 * exist or is deleted, unauthorized if not system admin. Steps:
 *
 * 1. Register and login as system admin
 * 2. Query a (prepopulated) benchmark definition, check key fields/organization
 *    metadata
 * 3. Try using a fake UUID, expect error
 * 4. Try as unauthenticated client, expect error
 */
export async function test_api_benchmark_definition_detail_retrieval_system_admin(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const joinInput = {
    email: `${RandomGenerator.alphabets(8)}@business-domain.com`,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: `${RandomGenerator.alphabets(8)}@business-domain.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(sysAdmin);

  // 2. Login as system admin for a fresh token
  const loginInput = {
    email: joinInput.email,
    provider: "local",
    provider_key: joinInput.provider_key,
    password: joinInput.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const authorized = await api.functional.auth.systemAdmin.login(connection, {
    body: loginInput,
  });
  typia.assert(authorized);

  // 3. Retrieve a real benchmark definition that should exist (simulate mode gets random valid, otherwise attempt an id)
  let existingBd: IHealthcarePlatformBenchmarkDefinition;
  if (connection.simulate) {
    existingBd = typia.random<IHealthcarePlatformBenchmarkDefinition>();
  } else {
    // For real backend, we should first list or create a benchmark, but the scenario states at least one exists
    // We'll hardcode a UUID for demonstration (in reality, fetch from an admin-only index/list endpoint)
    existingBd =
      await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.at(
        connection,
        {
          benchmarkId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
  }
  typia.assert(existingBd);

  // 4. Retrieve details using system admin privileges
  const fetched =
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.at(
      connection,
      { benchmarkId: existingBd.id },
    );
  typia.assert(fetched);

  // Validate fields match expectations
  TestValidator.equals("benchmarkId matches", fetched.id, existingBd.id);
  if (
    existingBd.organization_id !== null &&
    existingBd.organization_id !== undefined
  ) {
    TestValidator.equals(
      "organization_id matches",
      fetched.organization_id,
      existingBd.organization_id,
    );
  }
  TestValidator.equals(
    "code matches",
    fetched.benchmark_code,
    existingBd.benchmark_code,
  );
  TestValidator.equals("label matches", fetched.label, existingBd.label);
  TestValidator.equals("unit matches", fetched.unit, existingBd.unit);
  TestValidator.equals("value matches", fetched.value, existingBd.value);

  // 5. Non-existent id should fail
  await TestValidator.error(
    "non-existent benchmarkId causes error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.at(
        connection,
        { benchmarkId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );

  // 6. Deleted id: We cannot delete a benchmark def (no delete API here), so skipping explicit test
  // 7. Unauthenticated access: create a fresh connection without auth
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user denied access to details",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.at(
        unauthConn,
        { benchmarkId: existingBd.id },
      );
    },
  );
}
