import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIStoryfieldAiIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiIntegrationLog";
import type { IStoryfieldAiIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiIntegrationLog";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validate system admin integration log search/filter capabilities with
 * full access control and error handling.
 *
 * This test performs:
 *
 * 1. System admin registration and login
 * 2. Standard search queries with known/likely values (including pagination
 *    and sort)
 * 3. Filtering by event_type, subsystem, status, and keyword
 * 4. Edge case: use excessive page size (limit)
 * 5. Edge case: filter that matches nothing
 * 6. Access control: unauthenticated/non-admin cannot access log data
 * 7. Data and audit integrity validation for log results
 */
export async function test_api_integration_logs_admin_search_all_filters(
  connection: api.IConnection,
) {
  // 1. Register as new system admin
  const adminJoinInput = {
    external_admin_id: RandomGenerator.alphaNumeric(16),
    email: typia.random<string & tags.Format<"email">>(),
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(admin);

  // 2. Login as system admin
  const adminLoginInput = {
    external_admin_id: adminJoinInput.external_admin_id,
    email: adminJoinInput.email,
  } satisfies IStoryfieldAiSystemAdmin.ILogin;
  const adminAuth = await api.functional.auth.systemAdmin.login(connection, {
    body: adminLoginInput,
  });
  typia.assert(adminAuth);

  // 3. Standard integration log search with various filters
  // We'll first do a broad search (no filters) to get some reference data
  const baseLogs =
    await api.functional.storyfieldAi.systemAdmin.integrationLogs.index(
      connection,
      {
        body: {} satisfies IStoryfieldAiIntegrationLog.IRequest,
      },
    );
  typia.assert(baseLogs);
  // Validate data presence and audit fields
  TestValidator.predicate(
    "integration logs base search returns pagination info",
    baseLogs.pagination !== undefined &&
      typeof baseLogs.pagination.current === "number",
  );
  if (baseLogs.data.length > 0) {
    // Validate audit/tracing fields
    for (const log of baseLogs.data) {
      TestValidator.predicate(
        "integration log has created_at",
        typeof log.created_at === "string",
      );
      TestValidator.predicate(
        "integration log has updated_at",
        typeof log.updated_at === "string",
      );
      // These are allowed to be null/undefined:
      if (log.deleted_at !== null && log.deleted_at !== undefined) {
        TestValidator.predicate(
          "integration log deleted_at is date-time",
          typeof log.deleted_at === "string",
        );
      }
      // Optional: tracing references
      if (
        log.storyfield_ai_authenticateduser_id !== undefined &&
        log.storyfield_ai_authenticateduser_id !== null
      ) {
        TestValidator.predicate(
          "integration log user ID is string",
          typeof log.storyfield_ai_authenticateduser_id === "string",
        );
      }
      if (
        log.storyfield_ai_story_id !== undefined &&
        log.storyfield_ai_story_id !== null
      ) {
        TestValidator.predicate(
          "integration log story ID is string",
          typeof log.storyfield_ai_story_id === "string",
        );
      }
      // Required: event_type, subsystem, status
      TestValidator.predicate(
        "integration log has event_type",
        typeof log.event_type === "string",
      );
      TestValidator.predicate(
        "integration log has subsystem",
        typeof log.subsystem === "string",
      );
      TestValidator.predicate(
        "integration log has status",
        typeof log.status === "string",
      );
    }
    // Use reference values for filters
    const refLog = baseLogs.data[0];
    // 4. Search with event_type filter
    const logsByEventType =
      await api.functional.storyfieldAi.systemAdmin.integrationLogs.index(
        connection,
        {
          body: {
            event_type: refLog.event_type,
            limit: 10,
          } satisfies IStoryfieldAiIntegrationLog.IRequest,
        },
      );
    typia.assert(logsByEventType);
    for (const log of logsByEventType.data) {
      TestValidator.equals(
        "event_type filter works",
        log.event_type,
        refLog.event_type,
      );
    }
    // 5. Search with subsystem filter
    const logsBySubsystem =
      await api.functional.storyfieldAi.systemAdmin.integrationLogs.index(
        connection,
        {
          body: {
            subsystem: refLog.subsystem,
            limit: 10,
          } satisfies IStoryfieldAiIntegrationLog.IRequest,
        },
      );
    typia.assert(logsBySubsystem);
    for (const log of logsBySubsystem.data) {
      TestValidator.equals(
        "subsystem filter works",
        log.subsystem,
        refLog.subsystem,
      );
    }
    // 6. Search with status filter
    const logsByStatus =
      await api.functional.storyfieldAi.systemAdmin.integrationLogs.index(
        connection,
        {
          body: {
            status: refLog.status,
            limit: 10,
          } satisfies IStoryfieldAiIntegrationLog.IRequest,
        },
      );
    typia.assert(logsByStatus);
    for (const log of logsByStatus.data) {
      TestValidator.equals("status filter works", log.status, refLog.status);
    }
    // 7. Search by keyword in message (optional, if message exists)
    if (refLog.message && typeof refLog.message === "string") {
      const keyword = refLog.message.slice(0, 4);
      const logsByKeyword =
        await api.functional.storyfieldAi.systemAdmin.integrationLogs.index(
          connection,
          {
            body: {
              keyword,
              limit: 10,
            } satisfies IStoryfieldAiIntegrationLog.IRequest,
          },
        );
      typia.assert(logsByKeyword);
      for (const log of logsByKeyword.data) {
        TestValidator.predicate(
          "keyword search in message works",
          typeof log.message === "string"
            ? log.message.includes(keyword)
            : true,
        );
      }
    }
    // 8. Search by time range
    const logsByTime =
      await api.functional.storyfieldAi.systemAdmin.integrationLogs.index(
        connection,
        {
          body: {
            created_from: refLog.created_at,
            created_to: refLog.created_at,
            limit: 10,
          } satisfies IStoryfieldAiIntegrationLog.IRequest,
        },
      );
    typia.assert(logsByTime);
    for (const log of logsByTime.data) {
      TestValidator.equals(
        "created_at time filter works",
        log.created_at,
        refLog.created_at,
      );
    }
    // 9. Paginated query (page > 1)
    const pageQuery =
      await api.functional.storyfieldAi.systemAdmin.integrationLogs.index(
        connection,
        {
          body: {
            page: 2,
            limit: 1,
          } satisfies IStoryfieldAiIntegrationLog.IRequest,
        },
      );
    typia.assert(pageQuery);
    TestValidator.predicate(
      "paginated query returns valid result",
      pageQuery.pagination.current === 2,
    );
    // 10. Sort by created_at desc
    const sortDesc =
      await api.functional.storyfieldAi.systemAdmin.integrationLogs.index(
        connection,
        {
          body: {
            sort_by: "created_at",
            sort_order: "desc",
            limit: 5,
          } satisfies IStoryfieldAiIntegrationLog.IRequest,
        },
      );
    typia.assert(sortDesc);
    const descDates = sortDesc.data.map((log) => new Date(log.created_at));
    for (let i = 1; i < descDates.length; ++i) {
      TestValidator.predicate(
        "sort_order desc applied",
        descDates[i - 1] >= descDates[i],
      );
    }
  }
  // 11. Edge case: excessive page size
  await TestValidator.error("excessive page size (limit)", async () => {
    await api.functional.storyfieldAi.systemAdmin.integrationLogs.index(
      connection,
      {
        body: { limit: 10000 } satisfies IStoryfieldAiIntegrationLog.IRequest,
      },
    );
  });
  // 12. Edge case: non-existent filters
  const logsNonExistent =
    await api.functional.storyfieldAi.systemAdmin.integrationLogs.index(
      connection,
      {
        body: {
          event_type: "NON_EXISTENT_TYPE",
          limit: 5,
        } satisfies IStoryfieldAiIntegrationLog.IRequest,
      },
    );
  typia.assert(logsNonExistent);
  TestValidator.equals(
    "non-existent filter returns empty page",
    logsNonExistent.data.length,
    0,
  );
  // 13. Access control: unauthenticated (headers cleared)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to integration logs should fail",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.integrationLogs.index(
        unauthConn,
        {
          body: { limit: 1 } satisfies IStoryfieldAiIntegrationLog.IRequest,
        },
      );
    },
  );
}
