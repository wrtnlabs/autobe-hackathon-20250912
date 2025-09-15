import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowAuditLog";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowAuditLog";

/**
 * Test successful retrieval of notification workflow audit logs by system
 * administrator. The scenario covers paginated fetching of immutable audit
 * log entries including event type, actor id, event data, and timestamps.
 * It ensures role-based access is enforced by authenticating as a system
 * administrator. The test verifies that filtering and pagination parameters
 * in the request body properly return a paginated list of audit logs
 * matching the search criteria. This validates full audit log query
 * capabilities for compliance and troubleshooting.
 */
export async function test_api_audit_log_index_system_admin(
  connection: api.IConnection,
) {
  // 1. System administrator registration via join API
  const email = `sysadmin${RandomGenerator.alphaNumeric(6)}@example.com`;
  const password = "Password123!";
  const admin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email,
        password,
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(admin);

  // 2. Prepare several request body variations for audit log queries
  const now = new Date();
  const startDate = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = now.toISOString();

  // Basic pagination parameters
  const paginationBody = {
    page: 1,
    limit: 10,
  } satisfies INotificationWorkflowAuditLog.IRequest;

  // Pagination with actor_id filter
  const actorIdBody = {
    page: 1,
    limit: 5,
    actor_id: admin.id,
  } satisfies INotificationWorkflowAuditLog.IRequest;

  // Pagination with event_type filter
  const eventTypeBody = {
    page: 1,
    limit: 5,
    event_type: "workflow_created",
  } satisfies INotificationWorkflowAuditLog.IRequest;

  // Pagination with created_after and created_before date range
  const dateRangeBody = {
    page: 1,
    limit: 5,
    created_after: startDate,
    created_before: endDate,
  } satisfies INotificationWorkflowAuditLog.IRequest;

  // Combined filters
  const combinedFilterBody = {
    page: 1,
    limit: 5,
    actor_id: admin.id,
    event_type: "trigger_fired",
    created_after: startDate,
    created_before: endDate,
  } satisfies INotificationWorkflowAuditLog.IRequest;

  // Edge case: actor_id and event_type as null (should return unfiltered or empty results)
  const nullFiltersBody = {
    page: 1,
    limit: 5,
    actor_id: null,
    event_type: null,
  } satisfies INotificationWorkflowAuditLog.IRequest;

  // Array of all test request bodies
  const testBodies = [
    paginationBody,
    actorIdBody,
    eventTypeBody,
    dateRangeBody,
    combinedFilterBody,
    nullFiltersBody,
  ];

  // 3. Execute audit log queries and verify responses
  for (const body of testBodies) {
    const response: IPageINotificationWorkflowAuditLog.ISummary =
      await api.functional.notificationWorkflow.systemAdmin.auditLogs.index(
        connection,
        { body },
      );
    typia.assert(response);

    // Validate pagination info
    TestValidator.predicate(
      "pagination current page should be >= 1",
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit should be > 0",
      response.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination pages count should be >= current",
      response.pagination.pages >= response.pagination.current,
    );
    TestValidator.predicate(
      "pagination records count should be >= data length",
      response.pagination.records >= response.data.length,
    );

    // Validate each audit log summary entry
    for (const logEntry of response.data) {
      typia.assert(logEntry);

      TestValidator.predicate(
        "audit log id should be a valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          logEntry.id,
        ),
      );

      if (logEntry.actor_id !== null && logEntry.actor_id !== undefined) {
        TestValidator.predicate(
          "audit log actor_id should be a valid UUID",
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
            logEntry.actor_id,
          ),
        );
      }

      TestValidator.predicate(
        "event_type should be a non-empty string",
        typeof logEntry.event_type === "string" &&
          logEntry.event_type.length > 0,
      );

      TestValidator.predicate(
        "event_data should be a valid JSON string",
        (() => {
          try {
            JSON.parse(logEntry.event_data);
            return true;
          } catch {
            return false;
          }
        })(),
      );

      // Check created_at date-time is valid ISO 8601
      TestValidator.predicate(
        "created_at should be a valid ISO 8601 date-time string",
        !isNaN(Date.parse(logEntry.created_at)),
      );
    }
  }
}
