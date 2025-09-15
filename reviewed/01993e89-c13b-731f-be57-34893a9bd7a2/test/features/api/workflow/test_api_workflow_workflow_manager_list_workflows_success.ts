import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkflow";

/**
 * Test successful retrieval of a filtered and paginated list of
 * notification workflows by a workflow manager user.
 *
 * The test verifies that the API returns correct pagination info and
 * workflows matching the search criteria.
 *
 * Process:
 *
 * 1. Join as a new workflowManager user and authenticate.
 * 2. Call the workflow list API with a filter including 'code' and 'isActive'
 *    attributes.
 * 3. Validate that the returned data matches the requested filters and
 *    pagination info.
 */
export async function test_api_workflow_workflow_manager_list_workflows_success(
  connection: api.IConnection,
) {
  // 1. WorkflowManager user joins and authenticates
  const email: string = typia.random<string & tags.Format<"email">>();
  const passwordHash: string = RandomGenerator.alphaNumeric(32);
  const joinInput = {
    email,
    password_hash: passwordHash,
  } satisfies INotificationWorkflowWorkflowManager.ICreate;

  const authorized: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: joinInput,
    });
  typia.assert(authorized);

  // 2. Setup filter request data for workflow list query
  const filterRequest = {
    code: RandomGenerator.alphaNumeric(8),
    is_active: true,
    page: 1,
    limit: 5,
  } satisfies INotificationWorkflowWorkflow.IRequest;

  // 3. Call index API with filter
  const pagedResult: IPageINotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.index(
      connection,
      { body: filterRequest },
    );
  typia.assert(pagedResult);

  // 4. Validate pagination info
  TestValidator.predicate(
    "pagination current page greater or equal to 1",
    pagedResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    pagedResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages positive",
    pagedResult.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pagedResult.pagination.records >= 0,
  );

  // 5. Validate that all returned workflows match the filter criteria
  pagedResult.data.forEach((workflow) => {
    TestValidator.equals(
      "workflow is_active matches filter",
      workflow.is_active,
      true,
    );
    TestValidator.predicate(
      "workflow code is string",
      typeof workflow.code === "string",
    );
    TestValidator.predicate(
      "workflow code includes filter code",
      workflow.code.includes(filterRequest.code!),
    );
  });
}
