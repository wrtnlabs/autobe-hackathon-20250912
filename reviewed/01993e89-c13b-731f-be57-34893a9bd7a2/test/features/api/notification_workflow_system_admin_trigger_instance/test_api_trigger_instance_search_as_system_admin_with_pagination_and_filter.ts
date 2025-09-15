import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowTriggerInstance";

/**
 * Test notification workflow trigger instance search with authentication by
 * systemAdmin role.
 *
 * Verifies the complete role authentication of a system administrator and tests
 * the filtered, paginated trigger instance search functionality.
 *
 * Steps:
 *
 * 1. Register and authenticate a system administrator user
 * 2. Search trigger instances filtered by workflowId with pagination
 * 3. Assert that the returned data matches the expected pagination and structure
 */
export async function test_api_trigger_instance_search_as_system_admin_with_pagination_and_filter(
  connection: api.IConnection,
) {
  // 1. Join and authenticate as system administrator
  const systemAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;

  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminJoinBody,
    });
  typia.assert(systemAdmin);

  // 2. Prepare search request with realistic pagination and filtering
  const workflowId = typia.random<string & tags.Format<"uuid">>();
  const page = Math.max(
    1,
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >(),
  );
  const limit = Math.min(
    Math.max(
      1,
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
    ),
    100,
  );

  const searchRequestBody = {
    workflow_id: workflowId,
    page: page,
    limit: limit,
  } satisfies INotificationWorkflowTriggerInstance.IRequest;

  // 3. Execute search for trigger instances
  const searchResult: IPageINotificationWorkflowTriggerInstance.ISummary =
    await api.functional.notificationWorkflow.systemAdmin.triggerInstances.searchTriggerInstances(
      connection,
      {
        body: searchRequestBody,
      },
    );
  typia.assert(searchResult);

  // 4. Validate pagination and data consistency
  TestValidator.equals(
    "pagination current page matches request",
    searchResult.pagination.current,
    searchRequestBody.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    searchResult.pagination.limit,
    searchRequestBody.limit,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    searchResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(searchResult.data));

  TestValidator.predicate(
    "all data items conform to summary schema",
    searchResult.data.every(
      (item) =>
        typeof item.id === "string" &&
        typeof item.workflow_id === "string" &&
        typeof item.idempotency_key === "string" &&
        (item.cursor_current_node_id === null ||
          typeof item.cursor_current_node_id === "string") &&
        typeof item.status === "string" &&
        typeof item.attempts === "number" &&
        typeof item.available_at === "string",
    ),
  );
}
