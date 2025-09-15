import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBenchmarkDefinition";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Organization admin creates a new benchmark definition for the organization,
 * testing correct creation and duplicate constraint.
 *
 * Steps:
 *
 * 1. Register a new organization admin using unique email, password, and full_name
 * 2. Login as org admin to establish authentication context
 * 3. Create a benchmark definition with valid payload (organization_id from admin,
 *    unique benchmark_code, value, unit, label, dates, description)
 * 4. Verify benchmark creation: all fields match the request, organization link
 *    correct
 * 5. Attempt duplicate creation with same benchmark_code for org—should fail as
 *    per business rules
 */
export async function test_api_benchmark_definition_creation_org_admin(
  connection: api.IConnection,
) {
  // 1. Register org admin
  const orgAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const orgAdminFullName: string = RandomGenerator.name();
  const orgAdminPassword: string = RandomGenerator.alphaNumeric(10);
  const joinResponse: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminEmail,
        full_name: orgAdminFullName,
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(joinResponse);

  // 2. Login as org admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Create benchmark definition (should succeed)
  const benchmarkCode = RandomGenerator.alphaNumeric(8);
  const now = new Date();
  const effectiveStartAt = now.toISOString();
  const effectiveEndAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const creationPayload = {
    organization_id: joinResponse.id,
    benchmark_code: benchmarkCode,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    value: typia.random<number>(),
    unit: RandomGenerator.alphaNumeric(4),
    effective_start_at: effectiveStartAt,
    effective_end_at: effectiveEndAt,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IHealthcarePlatformBenchmarkDefinition.ICreate;
  const createdBenchmark: IHealthcarePlatformBenchmarkDefinition =
    await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.create(
      connection,
      {
        body: creationPayload,
      },
    );
  typia.assert(createdBenchmark);
  TestValidator.equals(
    "organization_id matches",
    createdBenchmark.organization_id,
    creationPayload.organization_id,
  );
  TestValidator.equals(
    "benchmark_code matches",
    createdBenchmark.benchmark_code,
    benchmarkCode,
  );
  TestValidator.equals(
    "label matches",
    createdBenchmark.label,
    creationPayload.label,
  );
  TestValidator.equals(
    "value matches",
    createdBenchmark.value,
    creationPayload.value,
  );
  TestValidator.equals(
    "unit matches",
    createdBenchmark.unit,
    creationPayload.unit,
  );
  TestValidator.equals(
    "effective_start_at matches",
    createdBenchmark.effective_start_at,
    creationPayload.effective_start_at,
  );
  TestValidator.equals(
    "effective_end_at matches",
    createdBenchmark.effective_end_at,
    creationPayload.effective_end_at,
  );
  TestValidator.equals(
    "description matches",
    createdBenchmark.description,
    creationPayload.description,
  );

  // 4. Attempt to create duplicate benchmark_code for same org
  await TestValidator.error(
    "duplicate benchmark_code should fail",
    async () =>
      await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.create(
        connection,
        {
          body: {
            ...creationPayload,
          } satisfies IHealthcarePlatformBenchmarkDefinition.ICreate,
        },
      ),
  );
}
