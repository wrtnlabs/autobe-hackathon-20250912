import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkflowNode";

export async function test_api_workflow_node_list_pagination_systemadmin_success(
  connection: api.IConnection,
) {
  // 1. Create a systemAdmin user by join
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const admin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email,
        password,
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(admin);

  // 2. Login as the systemAdmin user
  const login: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email,
        password,
      } satisfies INotificationWorkflowSystemAdmin.IRequestLogin,
    });
  typia.assert(login);

  // 3. Call workflowNodes index endpoint with filtering by workflowId and pagination
  // Generate a random UUID to simulate an existing workflowId filter
  const workflowId = typia.random<string & tags.Format<"uuid">>();
  const paginationLimit = 10;
  const paginationPage = 1;
  const requestBody = {
    workflow_id: workflowId,
    page: paginationPage,
    limit: paginationLimit,
  } satisfies INotificationWorkflowWorkflowNode.IRequest;
  const response: IPageINotificationWorkflowWorkflowNode.ISummary =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.index(
      connection,
      {
        workflowId,
        body: requestBody,
      },
    );
  typia.assert(response);

  // 4. Assert pagination metadata correctness
  TestValidator.predicate(
    "pagination current page must be correct",
    response.pagination.current === paginationPage,
  );
  TestValidator.predicate(
    "pagination limit must be correct",
    response.pagination.limit === paginationLimit,
  );
  TestValidator.predicate(
    "pagination records count must be a number and non-negative",
    typeof response.pagination.records === "number" &&
      response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count must be a number and at least 1",
    typeof response.pagination.pages === "number" &&
      response.pagination.pages >= 1,
  );

  // 5. Assert each node in data array contains essential summary properties
  for (const node of response.data) {
    typia.assert(node);
    TestValidator.predicate(
      "node id is non-empty string",
      typeof node.id === "string" && node.id.length > 0,
    );
    TestValidator.predicate(
      "node type is non-empty string",
      typeof node.node_type === "string" && node.node_type.length > 0,
    );
    TestValidator.predicate(
      "node name is non-empty string",
      typeof node.name === "string" && node.name.length > 0,
    );
  }
}
