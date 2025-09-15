import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowNodeTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowNodeTemplate";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";

/**
 * This test validates the retrieval of detailed notification workflow node
 * template information by a system administrator.
 *
 * It ensures that:
 *
 * 1. A system administrator can be successfully created and authenticated.
 * 2. The system administrator can retrieve a node template by its unique ID.
 * 3. The response includes all expected fields and the node template matches the
 *    requested ID.
 * 4. Access controls prevent unauthorized roles from accessing this endpoint.
 *
 * Workflow:
 *
 * 1. Create and authenticate a system admin user.
 * 2. Retrieve a node template by a valid known ID.
 * 3. Validate the response content.
 * 4. Verify authorization is required.
 *
 * Note: The nodeTemplateId used is a random UUID and may not correspond to a
 * real node template in production, suitable in simulated or isolated test
 * environments.
 */
export async function test_api_node_template_at_as_system_admin_success(
  connection: api.IConnection,
) {
  // Step 1: Create system administrator user and authenticate
  const systemAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;

  const admin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminJoinBody,
    });
  typia.assert(admin);

  // Step 2: Generate or select a valid nodeTemplateId UUID (random for test)
  const nodeTemplateId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Retrieve node template by ID
  const nodeTemplate: INotificationWorkflowNodeTemplate =
    await api.functional.notificationWorkflow.systemAdmin.nodeTemplates.at(
      connection,
      { nodeTemplateId },
    );
  typia.assert(nodeTemplate);

  // Step 4: Validate the node template ID matches request
  TestValidator.equals(
    "Node template ID matches requested ID",
    nodeTemplate.id,
    nodeTemplateId,
  );

  // Step 5: Check access control by using a disconnected connection (unauthenticated)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("Unauthorized access is forbidden", async () => {
    await api.functional.notificationWorkflow.systemAdmin.nodeTemplates.at(
      unauthConn,
      { nodeTemplateId },
    );
  });
}
