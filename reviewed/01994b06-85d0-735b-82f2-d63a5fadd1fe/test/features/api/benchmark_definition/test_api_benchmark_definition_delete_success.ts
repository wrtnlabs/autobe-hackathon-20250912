import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBenchmarkDefinition";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate successful deletion of a benchmark definition by system admin.
 *
 * 1. Create and log in as a system admin
 * 2. Create a benchmark definition and verify creation
 * 3. Delete the created benchmark definition and confirm success
 * 4. Attempt to delete the already-deleted definition again, expect error
 * 5. Attempt to delete a truly non-existent definition (random UUID), expect error
 */
export async function test_api_benchmark_definition_delete_success(
  connection: api.IConnection,
) {
  // 1. System admin registration (join)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminProvider = "local";
  const adminJoinFullName = RandomGenerator.name();
  const adminProviderKey = adminEmail;
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const joinBody = {
    email: adminEmail,
    full_name: adminJoinFullName,
    provider: adminProvider,
    provider_key: adminProviderKey,
    password: adminPassword,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;

  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(adminAuth);

  // 2. Admin Login - simulate session
  const loginBody = {
    email: adminEmail,
    provider: adminProvider,
    provider_key: adminProviderKey,
    password: adminPassword,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;

  const adminLogged = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(adminLogged);

  // 3. Create a new benchmark definition
  const benchmarkCreateBody = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    benchmark_code: RandomGenerator.alphaNumeric(8),
    label: RandomGenerator.paragraph({ sentences: 3 }),
    value: Math.round(Math.random() * 1000) / 10,
    unit: RandomGenerator.pick([
      "percent",
      "per_1000",
      "score",
      "seconds",
      "cases",
    ] as const),
    effective_start_at: new Date().toISOString(),
    effective_end_at: null,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IHealthcarePlatformBenchmarkDefinition.ICreate;

  const createdBenchmark =
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.create(
      connection,
      { body: benchmarkCreateBody },
    );
  typia.assert(createdBenchmark);
  TestValidator.equals(
    "label of created benchmark",
    createdBenchmark.label,
    benchmarkCreateBody.label,
  );

  // 4. Delete the created benchmark definition
  await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.erase(
    connection,
    { benchmarkId: createdBenchmark.id },
  );

  // 5. Attempt to delete again - expect error
  await TestValidator.error(
    "delete already-deleted benchmark should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.erase(
        connection,
        { benchmarkId: createdBenchmark.id },
      );
    },
  );

  // 6. Attempt to delete a non-existent benchmark (random UUID) - expect error
  await TestValidator.error(
    "delete non-existent benchmark should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.erase(
        connection,
        { benchmarkId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
