import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAuditLogArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAuditLogArchive";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAuditLogArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAuditLogArchive";

/**
 * Validate that an organization admin can only search audit log archive
 * records scoped to their own organization, and robust error
 * handling/cross-organization isolation is enforced.
 *
 * 1. Register Organization Admin 1.
 * 2. Login as Admin 1.
 * 3. Query audit log archives for Admin 1's org (expect only their org's data,
 *    correctly paginated).
 * 4. Register Organization Admin 2 (diff org).
 * 5. Login as Admin 2.
 * 6. Attempt to query Admin 1's org audit log archives (should error or return
 *    no data).
 * 7. Confirm correct errors are thrown for missing organization_id and no
 *    cross-org leakage occurs in pagination/filtering.
 */
export async function test_api_audit_log_archive_search_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register Organization Admin 1
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1FullName = RandomGenerator.name();
  const admin1Join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: admin1Email,
        full_name: admin1FullName,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(admin1Join);
  // Infer an organization_id available for this admin via existing audit log archives (if any exist)
  const admin1OrgId = await (async () => {
    const seedPage =
      await api.functional.healthcarePlatform.organizationAdmin.auditLogArchives.index(
        connection,
        {
          body: {
            page: 1,
            page_size: 1,
          } satisfies IHealthcarePlatformAuditLogArchive.IRequest,
        },
      );
    typia.assert(seedPage);
    if (seedPage.data.length > 0) return seedPage.data[0].organization_id;
    // fallback: create random org id for stubbed/test envs
    return typia.random<string & tags.Format<"uuid">>();
  })();

  // 2. Login as Admin 1
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: admin1Email,
      // password omitted as may be null/undefined depending on SSO/local auth
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Query audit log archives for this org ID as Admin 1
  const admin1Archives =
    await api.functional.healthcarePlatform.organizationAdmin.auditLogArchives.index(
      connection,
      {
        body: {
          organization_id: admin1OrgId,
          page: 1,
          page_size: 10,
        } satisfies IHealthcarePlatformAuditLogArchive.IRequest,
      },
    );
  typia.assert(admin1Archives);
  TestValidator.predicate(
    "all audit log archive records belong to admin1's org",
    admin1Archives.data.every((rec) => rec.organization_id === admin1OrgId),
  );

  // 4. Register Organization Admin 2 (should belong to a different org in real systems)
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2FullName = RandomGenerator.name();
  const admin2Join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: admin2Email,
        full_name: admin2FullName,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(admin2Join);

  // 5. Login as Admin 2
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: admin2Email,
      // password omitted as may be null/undefined depending on SSO/local auth
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 6. Attempt to read Admin 1's org archives (should error: forbidden or not found)
  await TestValidator.error(
    "org admin 2 cannot access org admin 1's audit log archives",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.auditLogArchives.index(
        connection,
        {
          body: {
            organization_id: admin1OrgId,
            page: 1,
            page_size: 10,
          } satisfies IHealthcarePlatformAuditLogArchive.IRequest,
        },
      );
    },
  );

  // 7. Error scenario: missing organization_id (should error)
  await TestValidator.error(
    "missing organization_id filter triggers error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.auditLogArchives.index(
        connection,
        {
          body: {
            page: 1,
            page_size: 1,
          } satisfies IHealthcarePlatformAuditLogArchive.IRequest,
        },
      );
    },
  );
}
