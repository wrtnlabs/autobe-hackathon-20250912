import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkflowNode";

/**
 * Test retrieving a paginated list of workflow nodes for a given workflow
 * by a workflow manager user.
 *
 * This test performs the following steps:
 *
 * 1. Creates a workflow manager user by joining via the
 *    '/auth/workflowManager/join' endpoint, authenticating and obtaining a
 *    token.
 * 2. Creates a new notification workflow via the
 *    '/notificationWorkflow/workflowManager/workflows' endpoint, including
 *    a valid entry node ID.
 * 3. Uses the created workflow's ID to request a paginated listing of workflow
 *    nodes via PATCH method from
 *    '/notificationWorkflow/workflowManager/workflows/{workflowId}/workflowNodes'.
 * 4. Validates the response data contains correct pagination metadata and
 *    workflow nodes data.
 *
 * The test ensures successful data retrieval with proper authentication and
 * verifies pagination information correctness and data integrity.
 *
 * @param connection Connected API client
 */
export async function test_api_notificationworkflow_workflowmanager_workflownodes_list_success(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a workflow manager user
  const email = `manager_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const manager = await api.functional.auth.workflowManager.join(connection, {
    body: {
      email,
      password_hash: passwordHash,
    } satisfies INotificationWorkflowWorkflowManager.ICreate,
  });
  typia.assert(manager);

  // Step 2: Create a notification workflow to obtain workflowId
  const entryNodeId = typia.random<string & tags.Format<"uuid">>();
  const workflowCode = `wf_${RandomGenerator.alphaNumeric(6)}`;
  const workflowName = `Workflow ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 })}`;
  const workflowCreateData = {
    code: workflowCode,
    name: workflowName,
    is_active: true,
    entry_node_id: entryNodeId,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const workflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      {
        body: workflowCreateData,
      },
    );
  typia.assert(workflow);

  // Step 3: Request a list of workflow nodes for the created workflow with pagination
  const page = 1;
  const limit = 5;
  const filterBody = {
    workflow_id: workflow.id,
    page,
    limit,
  } satisfies INotificationWorkflowWorkflowNode.IRequest;

  const pageResult =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.index(
      connection,
      {
        workflowId: workflow.id,
        body: filterBody,
      },
    );
  typia.assert(pageResult);

  // Validate pagination info
  TestValidator.equals(
    "pagination current page",
    pageResult.pagination.current,
    page,
  );
  TestValidator.equals("pagination limit", pageResult.pagination.limit, limit);
  TestValidator.predicate(
    "pagination records non-negative",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pageResult.pagination.pages >= 0,
  );

  // Validate returned data is an array
  TestValidator.predicate("data is array", Array.isArray(pageResult.data));

  // If data page is not empty, validate individual node properties
  if (pageResult.data.length > 0) {
    for (const node of pageResult.data) {
      TestValidator.predicate(
        "node id is uuid",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          node.id,
        ),
      );
      TestValidator.predicate(
        "node node_type non-empty",
        typeof node.node_type === "string" && node.node_type.length > 0,
      );
      TestValidator.predicate(
        "node name is string",
        typeof node.name === "string" && node.name.length > 0,
      );
      TestValidator.predicate(
        "created_at is date-time string or undefined",
        node.created_at === undefined || !isNaN(Date.parse(node.created_at)),
      );
      TestValidator.predicate(
        "updated_at is date-time string or undefined",
        node.updated_at === undefined || !isNaN(Date.parse(node.updated_at)),
      );
    }
  }
}
