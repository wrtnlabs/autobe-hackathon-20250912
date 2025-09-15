import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowEdge";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkflowEdge";

/**
 * Tests listing of a notification workflow's edges as a system
 * administrator.
 *
 * This E2E test performs the following steps:
 *
 * 1. Create a system administrator user and authenticate.
 * 2. Create a notification workflow with entry node, obtaining the workflowId.
 * 3. List workflow edges for the created workflow using no filters, verifying
 *    full list response.
 * 4. Test filtering by workflow_id property to find edges belonging to the
 *    created workflow.
 * 5. Validate pagination by requesting filtered edges and verifying pagination
 *    info.
 * 6. Validate that all edges contain valid UUIDs for from_node_id and
 *    to_node_id.
 *
 * Each step verifies the API response data structure using typia.assert and
 * business logic expectations using TestValidator.
 *
 * This test is critical for ensuring system administrators can manage
 * notification workflows by viewing and filtering edges correctly.
 */
export async function test_api_systemadmin_list_workflow_edges(
  connection: api.IConnection,
) {
  // Step 1: Create system administrator user
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: systemAdminEmail,
      password: "AdminPass1234",
    } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
  });
  typia.assert(systemAdmin);
  TestValidator.predicate(
    "systemAdmin token is present",
    typeof systemAdmin.token.access === "string" &&
      systemAdmin.token.access.length > 0,
  );

  // Step 2: Create notification workflow with entry node
  const entryNodeId = typia.random<string & tags.Format<"uuid">>();
  const workflowCreateBody = {
    code: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 6 }),
    name: RandomGenerator.name(3),
    is_active: true,
    entry_node_id: entryNodeId,
    version: 1 as number & tags.Type<"int32">,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const workflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.create(
      connection,
      { body: workflowCreateBody },
    );
  typia.assert(workflow);
  TestValidator.equals(
    "workflow entry_node_id",
    workflow.entry_node_id,
    entryNodeId,
  );

  // Step 3: List workflow edges for the workflow with empty filter
  const indexEmptyFilter =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowEdges.indexWorkflowEdges(
      connection,
      {
        workflowId: workflow.id,
        body: {},
      },
    );
  typia.assert(indexEmptyFilter);
  TestValidator.predicate(
    "list returned data array",
    Array.isArray(indexEmptyFilter.data),
  );
  TestValidator.predicate(
    "pagination current page >= 0",
    typeof indexEmptyFilter.pagination.current === "number" &&
      indexEmptyFilter.pagination.current >= 0,
  );

  // Step 4: Filter edges by workflow_id
  const filterByWorkflowId: INotificationWorkflowWorkflowEdge.IRequest = {
    workflow_id: workflow.id,
  };
  const indexFilterByWorkflowId =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowEdges.indexWorkflowEdges(
      connection,
      {
        workflowId: workflow.id,
        body: filterByWorkflowId,
      },
    );
  typia.assert(indexFilterByWorkflowId);
  TestValidator.predicate(
    "filtered results have workflow_id",
    indexFilterByWorkflowId.data.every(
      (edge) => edge.workflow_id === workflow.id,
    ),
  );

  // Step 5: Pagination test - call once and check pagination response
  const paginationFilteredRequest: INotificationWorkflowWorkflowEdge.IRequest =
    {
      workflow_id: workflow.id,
    };
  const pageResult =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowEdges.indexWorkflowEdges(
      connection,
      {
        workflowId: workflow.id,
        body: paginationFilteredRequest,
      },
    );
  typia.assert(pageResult);
  TestValidator.predicate(
    "pagination pages non-negative",
    pageResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    pageResult.pagination.records >= pageResult.data.length,
  );

  // Step 6: Validate from_node_id and to_node_id are valid UUIDs
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const edge of indexEmptyFilter.data) {
    TestValidator.predicate(
      "from_node_id is valid UUID",
      uuidRegex.test(edge.from_node_id),
    );
    TestValidator.predicate(
      "to_node_id is valid UUID",
      uuidRegex.test(edge.to_node_id),
    );
  }
}
