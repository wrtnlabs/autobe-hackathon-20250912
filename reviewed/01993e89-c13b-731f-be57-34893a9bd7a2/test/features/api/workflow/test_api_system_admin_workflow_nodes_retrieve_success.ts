import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

/**
 * This E2E test function validates the successful retrieval of detailed
 * information of a workflow node within a specific workflow by its ID,
 * authenticated as a system administrator.
 *
 * The function performs the complete workflow from system administrator
 * registration, notification workflow creation, workflow node creation, to
 * retrieving and verifying the workflow node details.
 *
 * It tests the correctness and integrity of the workflow node retrieval API for
 * the system administrator role.
 *
 * The test enforces full schema compliance, proper authentication, format
 * adherence, and ensures that all returned data matches the created resource
 * exactly.
 *
 * Steps:
 *
 * 1. System administrator registration and authentication
 * 2. Notification workflow creation with proper entry node
 * 3. Workflow node creation within the workflow
 * 4. Retrieval of the created workflow node by ID
 * 5. Validation that the retrieved data matches the created node
 */
export async function test_api_system_admin_workflow_nodes_retrieve_success(
  connection: api.IConnection,
) {
  // 1. System administrator registration
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPassword = "P@ssw0rd123";

  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: systemAdminEmail,
      password: systemAdminPassword,
    } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
  });
  typia.assert(systemAdmin);

  // 2. Create a new notification workflow
  const entryNodeId = typia.random<string & tags.Format<"uuid">>();
  const workflowCreateBody = {
    code: `WF-${RandomGenerator.alphaNumeric(6)}`,
    name: `Workflow ${RandomGenerator.name(2)}`,
    is_active: true,
    entry_node_id: entryNodeId,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const workflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.create(
      connection,
      {
        body: workflowCreateBody,
      },
    );
  typia.assert(workflow);

  // 3. Create a new workflow node within the workflow
  const workflowNodeCreateBody = {
    workflow_id: workflow.id,
    node_type: "Email",
    name: `Node ${RandomGenerator.name(1)}`,
    email_to_template: `{{ user.email }}`,
    email_subject_template: `Subject: ${RandomGenerator.name(3)}`,
    email_body_template: `Body content: ${RandomGenerator.content({ paragraphs: 1, sentenceMin: 5, sentenceMax: 10 })}`,
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const workflowNode =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: workflowNodeCreateBody,
      },
    );
  typia.assert(workflowNode);

  // 4. Retrieve the workflow node by ID
  const retrievedWorkflowNode =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.at(
      connection,
      {
        workflowId: workflow.id,
        workflowNodeId: workflowNode.id,
      },
    );
  typia.assert(retrievedWorkflowNode);

  // 5. Validate that the retrieved workflow node matches the created one
  TestValidator.equals(
    "Retrieved workflow node matches the created node",
    retrievedWorkflowNode,
    workflowNode,
  );
}
