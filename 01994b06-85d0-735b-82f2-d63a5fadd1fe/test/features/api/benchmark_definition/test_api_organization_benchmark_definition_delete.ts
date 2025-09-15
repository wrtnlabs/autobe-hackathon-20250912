import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBenchmarkDefinition";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * E2E test for deleting an organization-bound benchmark definition by an admin.
 *
 * Steps:
 *
 * 1. Register a new organization admin
 * 2. Login as this admin (auth token managed by SDK)
 * 3. Create a new benchmark definition for their org
 * 4. Delete the benchmark definition
 * 5. Try deleting it again - should throw error
 */
export async function test_api_organization_benchmark_definition_delete(
  connection: api.IConnection,
) {
  // 1. Register a new org admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const fullName = RandomGenerator.name();
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email,
      full_name: fullName,
      password,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Login as this admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email,
      password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Create new benchmark definition
  const now = new Date();
  const effectiveStart = now.toISOString();
  const effectiveEnd = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createBody = {
    organization_id: admin.id,
    benchmark_code: RandomGenerator.alphaNumeric(8),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    value: Math.round(Math.random() * 1000) / 100,
    unit: RandomGenerator.pick(["percent", "per_1000", "score" as const]),
    effective_start_at: effectiveStart,
    effective_end_at: effectiveEnd,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IHealthcarePlatformBenchmarkDefinition.ICreate;
  const benchmark =
    await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(benchmark);
  TestValidator.equals(
    "organization_id matches",
    benchmark.organization_id,
    admin.id,
  );
  TestValidator.equals(
    "benchmark_code matches",
    benchmark.benchmark_code,
    createBody.benchmark_code,
  );

  // 4. Delete the benchmark definition
  await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.erase(
    connection,
    {
      benchmarkId: benchmark.id,
    },
  );

  // 5. Try deleting it again (should fail)
  await TestValidator.error(
    "deleting already deleted benchmark must throw",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.erase(
        connection,
        {
          benchmarkId: benchmark.id,
        },
      );
    },
  );
}
