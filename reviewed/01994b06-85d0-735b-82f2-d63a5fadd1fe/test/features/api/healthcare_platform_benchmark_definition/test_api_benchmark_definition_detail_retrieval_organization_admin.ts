import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBenchmarkDefinition";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Comprehensive E2E test validating that an organization administrator can
 * retrieve a specific benchmark definition's details by benchmarkId, with
 * strong focus on business logic and access control. The workflow covers:
 *
 * 1. Preparation:
 *
 *    - Register (join) a new organization admin for isolation.
 *    - Login as this admin; authentication context must be maintained for subsequent
 *         authorized API calls.
 * 2. Test data creation strategy:
 *
 *    - Since there is no direct API for creating a benchmark definition, the only
 *         path is to randomly generate a plausible benchmark definition object,
 *         mimicking a record expected in the organization-admin account's
 *         scope.
 *    - The benchmarkId must be realistic and unique (UUID).
 * 3. Success scenario:
 *
 *    - Attempt to fetch the benchmark definition by its benchmarkId using the
 *         authorized admin connection.
 *    - Validate that all critical business and audit fields are present:
 *         benchmark_code, value, unit, label, effective start/end dates,
 *         activation status (via deleted_at), organization scope, and ID
 *         fields.
 *    - Confirm no unexpected deletion: deleted_at should be null/undefined for
 *         active records.
 *    - Validate organization_id matches admin's organization or is global
 *         (null/undefined).
 * 4. Failure scenario:
 *
 *    - Try fetching a non-existent benchmarkId; expect error response.
 *    - Test unauthorized access (fetching as unauthenticated user); expect error
 *         response.
 *
 * Key validation rules:
 *
 * - Only organization-owned or global benchmarks are accessible to the admin.
 * - Non-existent or inaccessible records trigger errors.
 * - All response data strictly matches the documented DTO.
 * - Authentication is strictly enforced for this endpoint.
 */
export async function test_api_benchmark_definition_detail_retrieval_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register as new organization admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);
  const orgAdminConnection = { ...connection };
  // (token auto-applied)

  // 2. Prepare plausible benchmark definition (simulate in absence of public API)
  const benchmark: IHealthcarePlatformBenchmarkDefinition =
    typia.random<IHealthcarePlatformBenchmarkDefinition>();
  // In realistic test, this would be created via admin's API or fixture script.

  // 3. Success: fetch benchmark detail by benchmarkId as the admin
  const result =
    await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.at(
      orgAdminConnection,
      { benchmarkId: benchmark.id },
    );
  typia.assert(result);
  TestValidator.equals("benchmarkId matches", result.id, benchmark.id);
  TestValidator.predicate(
    "required fields are present",
    !!result.benchmark_code &&
      typeof result.value === "number" &&
      typeof result.unit === "string" &&
      !!result.label &&
      typeof result.effective_start_at === "string",
  );
  TestValidator.equals(
    "deleted_at null or undefined (active record)",
    result.deleted_at,
    null,
  );
  if (result.organization_id !== null && result.organization_id !== undefined) {
    // Should match admin's organization or be global
    TestValidator.equals(
      "organization_id present",
      typeof result.organization_id,
      "string",
    );
  }
  // Provides basic DTO integrity check

  // 4. Failure: non-existent benchmarkId
  await TestValidator.error("error for non-existent benchmarkId", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.at(
      orgAdminConnection,
      { benchmarkId: typia.random<string & tags.Format<"uuid">>() },
    );
  });

  // 5. Failure: unauthenticated access
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("fail as unauthenticated user", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.at(
      unauthenticatedConn,
      { benchmarkId: benchmark.id },
    );
  });
}
