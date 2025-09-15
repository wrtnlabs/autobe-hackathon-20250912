import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformKpiSnapshot";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformKpiSnapshot";

/**
 * Validate system admin can securely retrieve KPI snapshot detail by id,
 * handle access rules and error conditions.
 *
 * 1. Register a system admin using POST /auth/systemAdmin/join (generate
 *    random join data using IHealthcarePlatformSystemAdmin.IJoin).
 * 2. Log in as that admin with POST /auth/systemAdmin/login for session setup.
 * 3. Use PATCH /healthcarePlatform/systemAdmin/kpiSnapshots with an empty
 *    filter to locate an existing KPI snapshot (for a valid test id). 3a.
 *    If none exists, fail the test (must have at least one snapshot in
 *    system for test execution).
 * 4. Retrieve the snapshot by GET
 *    /healthcarePlatform/systemAdmin/kpiSnapshots/{kpiSnapshotId} as
 *    authenticated admin.
 * 5. Assert that the detail payload matches the snapshot found in step 3
 *    (compare all fields for deep equality).
 * 6. Try retrieval with a random (nonexistent) UUID; must error
 *    (TestValidator.error).
 * 7. Try retrieval while unauthenticated (connection with headers cleared);
 *    must error (TestValidator.error).
 */
export async function test_api_kpi_snapshot_system_admin_retrieve_by_id_with_authentication(
  connection: api.IConnection,
) {
  // Step 1: Register a system admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: RandomGenerator.paragraph(),
    password: "TestP@ssw0rd123",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const authorizedAdmin = await api.functional.auth.systemAdmin.join(
    connection,
    { body: joinInput },
  );
  typia.assert(authorizedAdmin);

  // Step 2: Log in as the admin
  const loginInput = {
    email: joinInput.email,
    provider: joinInput.provider,
    provider_key: joinInput.provider_key,
    password: joinInput.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loginResp = await api.functional.auth.systemAdmin.login(connection, {
    body: loginInput,
  });
  typia.assert(loginResp);

  // Step 3: Locate an existing KPI snapshot
  const page =
    await api.functional.healthcarePlatform.systemAdmin.kpiSnapshots.index(
      connection,
      { body: {} satisfies IHealthcarePlatformKpiSnapshot.IRequest },
    );
  typia.assert(page);
  TestValidator.predicate(
    "at least one KPI snapshot exists",
    page.data.length > 0,
  );
  const originalSnapshot = page.data[0];
  typia.assert(originalSnapshot);

  // Step 4: Retrieve snapshot details by ID
  const retrieved =
    await api.functional.healthcarePlatform.systemAdmin.kpiSnapshots.at(
      connection,
      { kpiSnapshotId: originalSnapshot.id },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved snapshot matches list snapshot",
    retrieved,
    originalSnapshot,
  );

  // Step 5: Attempt retrieval with a random (nonexistent) UUID
  await TestValidator.error(
    "retrieval with invalid kpiSnapshotId errors",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.kpiSnapshots.at(
        connection,
        { kpiSnapshotId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );

  // Step 6: Attempt retrieval without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "retrieval without authentication is denied",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.kpiSnapshots.at(
        unauthConn,
        { kpiSnapshotId: originalSnapshot.id },
      );
    },
  );
}
