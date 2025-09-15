import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowNodeTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowNodeTemplate";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";

/**
 * This End-to-End test validates the workflow of registering a workflow manager
 * user, then fetching the details of a notification workflow node template by
 * its unique ID. It checks that the detailed node template data contains all
 * required fields and types.
 *
 * It also verifies that unauthorized or unauthenticated users cannot access the
 * node template endpoint.
 */
export async function test_api_node_template_at_as_workflow_manager_success(
  connection: api.IConnection,
) {
  // 1. Workflow manager user registration
  const account = await api.functional.auth.workflowManager.join(connection, {
    body: {
      email: `workflow_manager_${RandomGenerator.alphaNumeric(8)}@example.com`,
      password_hash: RandomGenerator.alphaNumeric(20),
    } satisfies INotificationWorkflowWorkflowManager.ICreate,
  });
  typia.assert(account);

  // 2. Prepare a valid node template ID (random UUID)
  const validNodeTemplateId = typia.random<string & tags.Format<"uuid">>();

  // 3. Fetch node template details
  const nodeTemplate: INotificationWorkflowNodeTemplate =
    await api.functional.notificationWorkflow.workflowManager.nodeTemplates.at(
      connection,
      {
        nodeTemplateId: validNodeTemplateId,
      },
    );
  typia.assert(nodeTemplate);

  // 4. Assert properties
  TestValidator.predicate(
    "nodeTemplate.id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      nodeTemplate.id,
    ),
  );
  TestValidator.predicate(
    "nodeTemplate.code is non-empty string",
    nodeTemplate.code.length > 0,
  );
  TestValidator.predicate(
    "nodeTemplate.name is non-empty string",
    nodeTemplate.name.length > 0,
  );
  TestValidator.predicate(
    "nodeTemplate.type is one of email, sms, delay",
    ["email", "sms", "delay"].includes(nodeTemplate.type),
  );
  TestValidator.predicate(
    "nodeTemplate.template_body is string",
    typeof nodeTemplate.template_body === "string",
  );
  TestValidator.predicate(
    "nodeTemplate.created_at is ISO datetime",
    !isNaN(Date.parse(nodeTemplate.created_at)),
  );
  TestValidator.predicate(
    "nodeTemplate.updated_at is ISO datetime",
    !isNaN(Date.parse(nodeTemplate.updated_at)),
  );

  // 5. Verify unauthorized access is rejected
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated request to nodeTemplate endpoint should fail",
    async () => {
      await api.functional.notificationWorkflow.workflowManager.nodeTemplates.at(
        unauthenticatedConnection,
        { nodeTemplateId: validNodeTemplateId },
      );
    },
  );
}
