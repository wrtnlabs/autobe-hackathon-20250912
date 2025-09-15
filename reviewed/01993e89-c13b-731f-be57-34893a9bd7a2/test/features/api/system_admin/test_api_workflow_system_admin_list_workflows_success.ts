import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkflow";

/**
 * This test validates the workflow listing functionality limited to
 * systemAdmin users.
 *
 * It first registers a new systemAdmin user via the join API to ensure
 * authenticated context. Then it performs a PATCH request on
 * '/notificationWorkflow/systemAdmin/workflows' endpoint, providing search
 * and pagination filters as per INotificationWorkflowWorkflow.IRequest
 * schema.
 *
 * The test asserts the received response is a paginated list
 * (IPageINotificationWorkflowWorkflow) containing notification workflows
 * matching the filters.
 *
 * Steps:
 *
 * 1. Register and authenticate systemAdmin user.
 * 2. Construct a search request with random but schema-compliant search
 *    filters including code, name, is_active, entry_node_id, version,
 *    created_at, updated_at, deleted_at, page, and limit.
 * 3. Call the workflow listing API.
 * 4. Validate the response type and data using typia.assert.
 */
export async function test_api_workflow_system_admin_list_workflows_success(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a systemAdmin user
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@systemadmin.test`,
    password: "Abcdefg1234!",
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;

  const admin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: joinBody });
  typia.assert(admin);

  // Step 2: Create a realistic search filter request for workflows
  const requestBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    is_active: RandomGenerator.pick([true, false] as const),
    entry_node_id: typia.random<string & tags.Format<"uuid">>(),
    version: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >() satisfies number as number,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    page: 1,
    limit: 10,
  } satisfies INotificationWorkflowWorkflow.IRequest;

  // Step 3: Call the workflow listing API
  const response: IPageINotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.index(
      connection,
      {
        body: requestBody,
      },
    );

  // Step 4: Validate the response
  typia.assert(response);
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    response.pagination.limit === 10,
  );
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  if (response.data.length > 0) {
    typia.assert(response.data[0]);
  }
}
