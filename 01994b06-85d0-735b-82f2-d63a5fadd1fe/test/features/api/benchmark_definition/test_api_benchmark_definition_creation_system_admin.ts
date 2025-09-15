import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBenchmarkDefinition";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system admin analytics benchmark definition creation workflow.
 *
 * Test process:
 *
 * 1. Register as new system admin (join)
 * 2. Login as system admin
 * 3. Create analytics benchmark definition with required fields
 * 4. Attempt to create a duplicate (same benchmark_code in organization, expect
 *    error)
 *
 * Validates success case and unique constraint enforcement.
 */
export async function test_api_benchmark_definition_creation_system_admin(
  connection: api.IConnection,
) {
  // Step 1: Register a new system admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // Step 2: Login as the system admin
  const loginBody = {
    email: adminJoinBody.email,
    provider: adminJoinBody.provider,
    provider_key: adminJoinBody.provider_key,
    password: adminJoinBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(adminLogin);

  // Step 3: Create analytics benchmark definition
  // Use admin's id as a simulated organization_id (since no API to create org)
  const organization_id = adminAuth.id satisfies string as string;
  const benchmark_code = RandomGenerator.alphaNumeric(8);
  const createBody = {
    organization_id,
    benchmark_code,
    label: RandomGenerator.paragraph({ sentences: 3 }),
    value: Math.round(Math.random() * 10000) / 100,
    unit: RandomGenerator.pick([
      "percent",
      "per_1000",
      "score",
      "seconds",
    ] as const),
    effective_start_at: new Date(
      Date.now() + 1000 * 60 * 60 * 24,
    ).toISOString(),
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IHealthcarePlatformBenchmarkDefinition.ICreate;
  const benchmark =
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.create(
      connection,
      { body: createBody },
    );
  typia.assert(benchmark);
  TestValidator.equals(
    "benchmark organization_id matches",
    benchmark.organization_id,
    organization_id,
  );
  TestValidator.equals(
    "benchmark code matches",
    benchmark.benchmark_code,
    benchmark_code,
  );

  // Step 4: Attempt to create duplicate benchmark_code in same organization - expect error
  await TestValidator.error(
    "duplicate benchmark_code in organization is rejected",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.create(
        connection,
        { body: { ...createBody } },
      );
    },
  );
}
