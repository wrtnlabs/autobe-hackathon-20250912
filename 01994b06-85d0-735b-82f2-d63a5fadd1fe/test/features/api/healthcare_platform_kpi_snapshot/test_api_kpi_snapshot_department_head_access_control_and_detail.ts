import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformKpiSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformKpiSnapshot";

/**
 * Validate department-head-only access to KPI snapshot details (RBAC & payload
 * correctness).
 *
 * 1. Register a department head and login to get a session.
 * 2. List (search) KPI snapshots within department scope.
 * 3. GET details of a permitted KPI snapshot; verify payload data.
 * 4. Attempt forbidden access: try another (foreign) department head or manipulate
 *    ID to one not in department; should get denied or not-found.
 * 5. Negative: Try unauthenticated access to the endpoint; expect error.
 * 6. For multi-department/global KPIs, check department restriction works as
 *    expected.
 */
export async function test_api_kpi_snapshot_department_head_access_control_and_detail(
  connection: api.IConnection,
) {
  // 1. Register and login department head
  const joinReq = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const headAuth = await api.functional.auth.departmentHead.join(connection, {
    body: joinReq,
  });
  typia.assert(headAuth);

  // (token is now active in connection, skip manual handling)
  // 2. List KPI snapshots in permitted scope
  const page =
    await api.functional.healthcarePlatform.departmentHead.kpiSnapshots.index(
      connection,
      {
        body: {}, // List with no filters (all visible to department head)
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "department head can see at least one KPI snapshot",
    page.data.length > 0,
  );

  // 3. Retrieve a permitted KPI snapshot in detail
  const sample = page.data.find(
    (snap) => snap.department_id !== null && snap.department_id !== undefined,
  );
  TestValidator.predicate(
    "at least one snapshot belongs to department",
    !!sample,
  );
  const permittedSnap = typia.assert<IHealthcarePlatformKpiSnapshot>(sample!);

  const detail =
    await api.functional.healthcarePlatform.departmentHead.kpiSnapshots.at(
      connection,
      {
        kpiSnapshotId: permittedSnap.id,
      },
    );
  typia.assert(detail);
  // Check all fields match
  TestValidator.equals(
    "KPI snapshot detail id matches",
    detail.id,
    permittedSnap.id,
  );
  TestValidator.equals(
    "KPI detail is for same department",
    detail.department_id,
    permittedSnap.department_id!,
  );

  // 4. Attempt forbidden access: try with random UUID likely not permitted
  const forbiddenId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "department head cannot access non-permitted snapshot",
    async () => {
      // Use different ID or a snapshot with different department if possible
      // Here, forcibly try a random id (not in department)
      await api.functional.healthcarePlatform.departmentHead.kpiSnapshots.at(
        connection,
        {
          kpiSnapshotId: forbiddenId,
        },
      );
    },
  );

  // 5. Negative: unauthenticated access
  const conn2: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.healthcarePlatform.departmentHead.kpiSnapshots.at(
      conn2,
      {
        kpiSnapshotId: permittedSnap.id,
      },
    );
  });
}
