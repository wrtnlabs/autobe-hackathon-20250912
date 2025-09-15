import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBenchmarkDefinition";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E scenario where a system admin updates an analytics benchmark definition.
 *
 * Steps:
 *
 * 1. Register system admin via POST /auth/systemAdmin/join
 * 2. Log in as system admin
 * 3. Create a unique benchmark via POST
 *    /healthcarePlatform/systemAdmin/benchmarkDefinitions
 * 4. Update that benchmark using PUT
 *    /healthcarePlatform/systemAdmin/benchmarkDefinitions/{benchmarkId} with
 *    new label, value, effective window
 * 5. Validate the response: fields accurately reflect update, 'updated_at' is
 *    newer, and business logic is correct
 * 6. Try updating a non-existent benchmarkId: expect error
 * 7. Try duplicating label/unit within the organization: expect error (business
 *    logic error)
 */
export async function test_api_benchmark_definition_update_system_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: adminEmail,
      password: "Test1234!",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // login not technically needed, join provides token (already handled by SDK)

  // 2. Create initial benchmark definition for a random organization
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const initialBenchmarkCode = RandomGenerator.alphaNumeric(12);
  const createPayload = {
    organization_id: orgId,
    benchmark_code: initialBenchmarkCode,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    value: Math.round(Math.random() * 10000) / 100,
    unit: RandomGenerator.pick(["percent", "score", "per_1000"] as const),
    effective_start_at: new Date().toISOString(),
    effective_end_at: null,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IHealthcarePlatformBenchmarkDefinition.ICreate;
  const created =
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.create(
      connection,
      {
        body: createPayload,
      },
    );
  typia.assert(created);

  // 3. Update benchmark: change label/unit/value/dates/desc
  const newLabel = RandomGenerator.paragraph({ sentences: 3 });
  const newUnit = RandomGenerator.pick([
    "percent",
    "score",
    "per_1000",
  ] as const);
  const newValue = Math.round(Math.random() * 5000) / 100;
  const newDesc = RandomGenerator.paragraph({ sentences: 5 });
  const newStart = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const newEnd = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  const updatePayload = {
    label: newLabel,
    unit: newUnit,
    value: newValue,
    description: newDesc,
    effective_start_at: newStart,
    effective_end_at: newEnd,
  } satisfies IHealthcarePlatformBenchmarkDefinition.IUpdate;

  const beforeUpdate = created.updated_at;
  const updated =
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.update(
      connection,
      {
        benchmarkId: created.id,
        body: updatePayload,
      },
    );
  typia.assert(updated);
  TestValidator.equals("benchmark label updated", updated.label, newLabel);
  TestValidator.equals("benchmark unit updated", updated.unit, newUnit);
  TestValidator.equals("benchmark value updated", updated.value, newValue);
  TestValidator.equals(
    "benchmark description updated",
    updated.description,
    newDesc,
  );
  TestValidator.equals(
    "benchmark effective_start_at updated",
    updated.effective_start_at,
    newStart,
  );
  TestValidator.equals(
    "benchmark effective_end_at updated",
    updated.effective_end_at,
    newEnd,
  );
  TestValidator.predicate(
    "updated timestamp is newer",
    new Date(updated.updated_at) > new Date(beforeUpdate),
  );
  TestValidator.equals(
    "organization_id is unchanged",
    updated.organization_id,
    created.organization_id,
  );
  TestValidator.equals(
    "benchmark_code is unchanged",
    updated.benchmark_code,
    created.benchmark_code,
  );

  // 4. Update with invalid benchmarkId: expect error
  await TestValidator.error("update with invalid id should throw", async () => {
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.update(
      connection,
      {
        benchmarkId: typia.random<string & tags.Format<"uuid">>(),
        body: updatePayload,
      },
    );
  });

  // 5. Attempt duplicate benchmark (same org, same label/unit as another benchmark)
  // First, create a new benchmark with a unique code
  const dupLabel = RandomGenerator.paragraph({ sentences: 2 });
  const dupUnit = RandomGenerator.pick([
    "percent",
    "score",
    "per_1000",
  ] as const);
  const dupeBenchmark =
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.create(
      connection,
      {
        body: {
          organization_id: orgId,
          benchmark_code: RandomGenerator.alphaNumeric(12),
          label: dupLabel,
          value: 20.6,
          unit: dupUnit,
          effective_start_at: new Date().toISOString(),
          effective_end_at: null,
          description: "Baseline for duplication",
        } satisfies IHealthcarePlatformBenchmarkDefinition.ICreate,
      },
    );
  typia.assert(dupeBenchmark);
  // Now try to update the original to use the same label/unit as dupeBenchmark
  await TestValidator.error(
    "update with duplicate label/unit should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.update(
        connection,
        {
          benchmarkId: created.id,
          body: {
            label: dupLabel,
            unit: dupUnit,
          } satisfies IHealthcarePlatformBenchmarkDefinition.IUpdate,
        },
      );
    },
  );
}
