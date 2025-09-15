import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformFinancialAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformFinancialAuditLog";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformFinancialAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformFinancialAuditLog";

/**
 * Test advanced search and paginated listing of financial audit logs for system
 * admins.
 *
 * 1. System admin registers and authenticates.
 * 2. System admin creates an organization (obtain organization_id for filtering).
 * 3. System admin queries audit logs - default pagination (no filters).
 * 4. Query by valid organization_id (should only return logs for that org, or
 *    empty if none exist yet).
 * 5. Query by random non-existent user_id (should return empty result set).
 * 6. Query by impossible org_id (should return empty result set).
 * 7. Query with advanced filter: audit_action and time window.
 * 8. Confirm admin role is required by de-authenticating and attempting log
 *    query—should get error.
 */
export async function test_api_financial_audit_log_search_with_advanced_filtering(
  connection: api.IConnection,
) {
  // 1. System admin registration
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: systemAdminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: systemAdminEmail,
    password: "TestPassword123!",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const adminAuthorized = await api.functional.auth.systemAdmin.join(
    connection,
    { body: adminJoinBody },
  );
  typia.assert(adminAuthorized);

  // 2. System admin authentication
  const loginBody = {
    email: systemAdminEmail,
    provider: "local",
    provider_key: systemAdminEmail,
    password: "TestPassword123!",
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const adminLoggedIn = await api.functional.auth.systemAdmin.login(
    connection,
    { body: loginBody },
  );
  typia.assert(adminLoggedIn);

  // 3. Create new organization
  const orgCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgCreateBody },
    );
  typia.assert(org);

  // 4. Query audit logs with no filters
  const pageDefault =
    await api.functional.healthcarePlatform.systemAdmin.financialAuditLogs.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(pageDefault);
  TestValidator.predicate(
    "Default audit logs paginated page is valid",
    pageDefault.pagination.current === 1,
  );

  // 5. Query by proper organization_id
  const pageByOrg =
    await api.functional.healthcarePlatform.systemAdmin.financialAuditLogs.index(
      connection,
      {
        body: {
          organization_id: org.id,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(pageByOrg);
  if (pageByOrg.data.length > 0)
    TestValidator.predicate(
      "All logs have correct organization_id",
      pageByOrg.data.every((log) => log.organization_id === org.id),
    );

  // 6. Query by non-existent user_id (generate random uuid)
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  const pageByNonUser =
    await api.functional.healthcarePlatform.systemAdmin.financialAuditLogs.index(
      connection,
      {
        body: {
          user_id: nonExistentUserId,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(pageByNonUser);
  TestValidator.equals(
    "No logs should be returned for non-existent user",
    pageByNonUser.data.length,
    0,
  );

  // 7. Query by non-existent org_id for organization_id
  const nonExistentOrgId = typia.random<string & tags.Format<"uuid">>();
  const pageByNonOrg =
    await api.functional.healthcarePlatform.systemAdmin.financialAuditLogs.index(
      connection,
      {
        body: {
          organization_id: nonExistentOrgId,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(pageByNonOrg);
  TestValidator.equals(
    "No logs should be returned for non-existent org",
    pageByNonOrg.data.length,
    0,
  );

  // 8. Query with advanced filter: audit_action and action_timestamp window
  // Try to find a log to use for filter
  let auditAction: string | undefined = undefined;
  let timeFrom: string | undefined = undefined;
  let timeTo: string | undefined = undefined;
  if (pageDefault.data.length > 0) {
    auditAction = pageDefault.data[0].audit_action;
    timeFrom = pageDefault.data[0].action_timestamp;
    timeTo = pageDefault.data[0].action_timestamp;
  }
  if (auditAction && timeFrom && timeTo) {
    const advancedPage =
      await api.functional.healthcarePlatform.systemAdmin.financialAuditLogs.index(
        connection,
        {
          body: {
            audit_action: auditAction,
            action_timestamp_from: timeFrom,
            action_timestamp_to: timeTo,
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
          },
        },
      );
    typia.assert(advancedPage);
    // All returned logs should have audit_action and fall within timestamps
    TestValidator.predicate(
      "Advanced filter returns only logs matching action and time",
      advancedPage.data.every(
        (log) =>
          log.audit_action === auditAction &&
          (!log.action_timestamp ||
            (log.action_timestamp >= timeFrom! &&
              log.action_timestamp <= timeTo!)),
      ),
    );
  }

  // 9. Try without admin auth: un-authed connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Non-admin unauthorized request returns error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.financialAuditLogs.index(
        unauthConn,
        {
          body: {
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          },
        },
      );
    },
  );
}
