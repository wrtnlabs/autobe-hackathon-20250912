import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformKpiSnapshot";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformKpiSnapshot";

/**
 * Test the detailed retrieval of KPI snapshots by organization admin with
 * proper authentication and RBAC enforcement.
 *
 * Steps:
 *
 * 1. Register organization admin and login
 * 2. Ensure at least one KPI snapshot exists, retrieve list and id
 * 3. Fetch snapshot detail by id, validate payload and org affiliation
 * 4. Simulate cross-organization access and assert forbidden/not found
 * 5. Test invalid/missing id and unauthenticated fetch
 */
export async function test_api_kpi_snapshot_organization_admin_detail_with_proper_authentication(
  connection: api.IConnection,
) {
  // 1. Register and login as org admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        password: "S3curePwd!2024",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: "S3curePwd!2024",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 2. Search for at least one KPI snapshot in org
  const snapshotPage =
    await api.functional.healthcarePlatform.organizationAdmin.kpiSnapshots.index(
      connection,
      {
        body: {
          organization_id: adminJoin.id,
        } satisfies IHealthcarePlatformKpiSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  TestValidator.predicate(
    "org admin can see at least one snapshot",
    snapshotPage.data.length > 0,
  );

  const referenceSnapshot = snapshotPage.data[0];

  // 3. Fetch snapshot by id and verify payload
  const detail =
    await api.functional.healthcarePlatform.organizationAdmin.kpiSnapshots.at(
      connection,
      {
        kpiSnapshotId: referenceSnapshot.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "payload matches snapshot",
    detail.id,
    referenceSnapshot.id,
  );
  TestValidator.equals(
    "organization matches",
    detail.organization_id,
    referenceSnapshot.organization_id,
  );

  // 4. Simulate cross-org forbidden access
  const secondAdminEmail = typia.random<string & tags.Format<"email">>();
  const secondAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: secondAdminEmail,
        full_name: RandomGenerator.name(),
        password: "D1fferentPwd!2024",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(secondAdminJoin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: secondAdminEmail,
      password: "D1fferentPwd!2024",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "cross-org admin cannot access another org's snapshot",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.kpiSnapshots.at(
        connection,
        {
          kpiSnapshotId: referenceSnapshot.id,
        },
      );
    },
  );

  // 5. Invalid ID and unauthenticated access
  await TestValidator.error("fetch non-existent snapshot fails", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.kpiSnapshots.at(
      connection,
      {
        kpiSnapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated fetch should fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.kpiSnapshots.at(
      unauthConn,
      {
        kpiSnapshotId: referenceSnapshot.id,
      },
    );
  });
}
