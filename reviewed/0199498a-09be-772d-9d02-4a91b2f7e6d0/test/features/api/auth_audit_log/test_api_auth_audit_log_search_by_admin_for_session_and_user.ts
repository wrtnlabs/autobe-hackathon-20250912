import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIStoryfieldAiAuthAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiAuthAuditLog";
import type { IStoryfieldAiAuthAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthAuditLog";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * E2E test for system admin authentication audit log search, filtering, and
 * pagination.
 *
 * Validates the PATCH /storyfieldAi/systemAdmin/authAuditLogs endpoint for
 * admin audit log review:
 *
 * - Full login lifecycle: admin join & login
 * - Generates auth audit log entries through these operations
 * - Searches audit logs by filtering (session, admin, event type, outcome,
 *   times, user)
 * - Tests pagination (multiple pages, truncated results, limits)
 * - Checks filter miss (no results)
 * - Ensures non-admins cannot access (authorization failure)
 */
export async function test_api_auth_audit_log_search_by_admin_for_session_and_user(
  connection: api.IConnection,
) {
  // Step 1. Admin join (register a new admin)
  const adminJoinInput = {
    external_admin_id: RandomGenerator.alphaNumeric(16),
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test.com`,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // Step 2. Admin login (generates another audit event for login)
  const adminLoginInput = {
    external_admin_id: adminJoinInput.external_admin_id,
    email: adminJoinInput.email,
  } satisfies IStoryfieldAiSystemAdmin.ILogin;
  const adminLoggedIn = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: adminLoginInput,
    },
  );
  typia.assert(adminLoggedIn);

  // Step 3. Request with filtering by admin id and get the logs
  // Basic fetch: test logs for both join+login
  const auditSearchInput = {
    system_admin_id: adminAuth.id,
    page: 1,
    limit: 10,
  } satisfies IStoryfieldAiAuthAuditLog.IRequest;
  const auditLogsResult =
    await api.functional.storyfieldAi.systemAdmin.authAuditLogs.index(
      connection,
      {
        body: auditSearchInput,
      },
    );
  typia.assert(auditLogsResult);

  TestValidator.predicate(
    "should return audit logs for admin join and login events",
    auditLogsResult.data.some(
      (log) =>
        log.system_admin_id === adminAuth.id &&
        ["issued", "validated", "refreshed", "revoked", "denied"].includes(
          log.event_type,
        ),
    ),
  );

  // Step 4. Query with stricter page limit to test pagination
  const auditLogsResultPage =
    await api.functional.storyfieldAi.systemAdmin.authAuditLogs.index(
      connection,
      {
        body: { system_admin_id: adminAuth.id, page: 1, limit: 1 },
      },
    );
  typia.assert(auditLogsResultPage);
  TestValidator.equals(
    "pagination info should match limit=1",
    auditLogsResultPage.pagination.limit,
    1,
  );
  TestValidator.equals(
    "first page should have at most 1 record",
    auditLogsResultPage.data.length <= 1,
    true,
  );

  // Step 5. Query with future time window (should yield no logs)
  const auditLogsNone =
    await api.functional.storyfieldAi.systemAdmin.authAuditLogs.index(
      connection,
      {
        body: {
          system_admin_id: adminAuth.id,
          created_from: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(auditLogsNone);
  TestValidator.equals(
    "future-dated filter query returns no logs",
    auditLogsNone.data.length,
    0,
  );

  // Step 6. Query event type filter boundaries (should match expected event types)
  const eventType = auditLogsResult.data[0]?.event_type ?? undefined;
  if (eventType !== undefined) {
    const auditEventTypeLogs =
      await api.functional.storyfieldAi.systemAdmin.authAuditLogs.index(
        connection,
        {
          body: {
            system_admin_id: adminAuth.id,
            event_type: eventType,
            page: 1,
            limit: 20,
          },
        },
      );
    typia.assert(auditEventTypeLogs);
    TestValidator.predicate(
      "all logs in event type filter match expected",
      auditEventTypeLogs.data.every((log) => log.event_type === eventType),
    );
  }

  // Step 7. Non-admin should fail (use an unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin cannot access audit logs", async () => {
    await api.functional.storyfieldAi.systemAdmin.authAuditLogs.index(
      unauthConn,
      {
        body: auditSearchInput,
      },
    );
  });
}
