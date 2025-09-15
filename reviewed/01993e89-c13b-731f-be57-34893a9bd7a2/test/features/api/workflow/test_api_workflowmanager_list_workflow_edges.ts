import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowEdge";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkflowEdge";

/**
 * Test listing workflow edges for a notification workflow by an authorized
 * workflow manager.
 *
 * 1. Authenticate a workflow manager user via the join API.
 * 2. Create a notification workflow with required fields to obtain workflowId.
 * 3. Use the workflowId to request the list of workflow edges (with optional
 *    filtering) using pagination.
 * 4. Validate responses have correct types and expected data structure.
 * 5. Confirm that the authorization and workflow edge data listing works
 *    correctly.
 */
export async function test_api_workflowmanager_list_workflow_edges(
  connection: api.IConnection,
) {
  // 1. Join and authenticate workflow manager user
  const managerCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowWorkflowManager.ICreate;
  const manager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(manager);

  // 2. Create a notification workflow with valid initial data
  const workflowCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(3),
    is_active: true,
    entry_node_id: typia.random<string & tags.Format<"uuid">>(),
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      {
        body: workflowCreateBody,
      },
    );
  typia.assert(workflow);

  // 3. List workflow edges with optional filtering and pagination
  // Prepare a request body for filtering edges related to the created workflow
  const workflowEdgesRequestBody: INotificationWorkflowWorkflowEdge.IRequest = {
    workflow_id: workflow.id,
  };

  const edgesPage: IPageINotificationWorkflowWorkflowEdge =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowEdges.indexWorkflowEdges(
      connection,
      {
        workflowId: workflow.id,
        body: workflowEdgesRequestBody,
      },
    );
  typia.assert(edgesPage);

  // Validate pagination info structure
  TestValidator.predicate(
    "pagination current page is zero or more",
    edgesPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    edgesPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    edgesPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is positive",
    edgesPage.pagination.pages > 0,
  );

  // Validate each edge has matching workflow id and UUID format for IDs
  for (const edge of edgesPage.data) {
    TestValidator.equals("workflow id matches", edge.workflow_id, workflow.id);
    // Validate UUID format for id, from_node_id and to_node_id
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    TestValidator.predicate("valid uuid for edge id", uuidRegex.test(edge.id));
    TestValidator.predicate(
      "valid uuid for from_node_id",
      uuidRegex.test(edge.from_node_id),
    );
    TestValidator.predicate(
      "valid uuid for to_node_id",
      uuidRegex.test(edge.to_node_id),
    );

    // Check created_at and updated_at are non-empty strings
    TestValidator.predicate(
      "created_at is non-empty string",
      typeof edge.created_at === "string" && edge.created_at.length > 0,
    );
    TestValidator.predicate(
      "updated_at is non-empty string",
      typeof edge.updated_at === "string" && edge.updated_at.length > 0,
    );
  }
}
