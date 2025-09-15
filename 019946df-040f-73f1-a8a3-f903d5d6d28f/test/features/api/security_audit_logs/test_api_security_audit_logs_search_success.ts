import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSecurityAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSecurityAuditLog";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsSecurityAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsSecurityAuditLog";

/**
 * Test the security audit logs search API with success scenarios.
 *
 * This test performs a comprehensive workflow:
 *
 * 1. System administrator user creation and authentication.
 * 2. Security audit logs search with paginated parameters, filtering, and
 *    sorting.
 * 3. Validation of response structure, types, and business rules.
 * 4. Handling edge cases like empty results and invalid filters.
 *
 * The test ensures that only authenticated system admins can access
 * security audit logs. It also validates search filtering on event types,
 * text queries, and paginations.
 *
 * @param connection - API connection for making authenticated requests.
 */
export async function test_api_security_audit_logs_search_success(
  connection: api.IConnection,
) {
  // 1. System admin registration and get auth token
  const systemAdminCreateBody = {
    email: `sysadmin_${RandomGenerator.alphaNumeric(6)}@enterprise.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. Prepare search query parameters
  const page = 1;
  const limit = 10;
  const searchText = RandomGenerator.substring(
    "Security audit event login permission change access denied system",
  );
  const sort = "occurred_at desc";
  const filterByAction = "login_success";

  const searchRequest: IEnterpriseLmsSecurityAuditLog.IRequest = {
    page,
    limit,
    search: searchText,
    sort,
    filterByAction,
  };

  // 3. Perform the audit logs search
  const auditPage: IPageIEnterpriseLmsSecurityAuditLog.ISummary =
    await api.functional.enterpriseLms.systemAdmin.securityAuditLogs.index(
      connection,
      { body: searchRequest },
    );
  typia.assert(auditPage);

  // 4. Verify pagination info
  TestValidator.predicate(
    "Current page should equal requested page",
    auditPage.pagination.current === page,
  );
  TestValidator.predicate(
    "Page limit should equal requested limit",
    auditPage.pagination.limit === limit,
  );
  TestValidator.predicate(
    "Total pages should be positive",
    auditPage.pagination.pages > 0,
  );
  TestValidator.predicate(
    "Total records should be zero or more",
    auditPage.pagination.records >= 0,
  );

  // 5. Validate each audit log summary record
  for (const log of auditPage.data) {
    typia.assert(log);
    // event_type should include filter string
    TestValidator.predicate(
      `Audit log event_type includes filter '${filterByAction}' or not`,
      log.event_type.includes(filterByAction),
    );
    // occurred_at must be ISO date string
    TestValidator.predicate(
      `Audit log occurred_at format valid ISO8601`,
      typeof log.occurred_at === "string" &&
        !isNaN(Date.parse(log.occurred_at)),
    );
  }

  // 6. Test edge case: empty search results
  const emptySearchRequest = {
    page: 50, // high page number to likely get empty results
    limit: 10,
    search: "nonexistent_search_term_xyz",
    sort: "occurred_at desc",
    filterByAction: null,
  } satisfies IEnterpriseLmsSecurityAuditLog.IRequest;

  const emptyPage =
    await api.functional.enterpriseLms.systemAdmin.securityAuditLogs.index(
      connection,
      { body: emptySearchRequest },
    );
  typia.assert(emptyPage);

  TestValidator.predicate(
    "Empty search result returns zero records",
    emptyPage.data.length === 0,
  );

  // 7. Test invalid filterByAction gracefully (passing invalid string)
  const invalidFilterRequest = {
    page: 1,
    limit: 10,
    filterByAction: "invalid_action_type_xyz",
  } satisfies IEnterpriseLmsSecurityAuditLog.IRequest;

  const invalidFilterPage =
    await api.functional.enterpriseLms.systemAdmin.securityAuditLogs.index(
      connection,
      { body: invalidFilterRequest },
    );
  typia.assert(invalidFilterPage);

  // Response should be valid pagination with possibly zero data
  TestValidator.predicate(
    "Invalid filterByAction returns paginated result",
    invalidFilterPage.pagination.current === 1 &&
      invalidFilterPage.pagination.limit === 10 &&
      Array.isArray(invalidFilterPage.data),
  );
}
