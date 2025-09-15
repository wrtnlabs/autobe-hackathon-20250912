import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";

/**
 * Validate that a system administrator can successfully create a
 * notification workflow.
 *
 * This E2E test performs the full workflow creation as a system
 * administrator:
 *
 * 1. Create a system administrator user by invoking the authentication join
 *    endpoint.
 * 2. Utilize the authenticated system administrator to create a notification
 *    workflow with all required fields.
 * 3. Validate the returned notification workflow fields.
 *
 * The workflow includes unique code, name, active status, entry node id,
 * version, and timestamps. All values adhere to the specified format
 * constraints such as UUID and date-time.
 */
export async function test_api_notification_workflow_workflow_systemadmin_create_success(
  connection: api.IConnection,
) {
  // 1. Create system administrator user and authenticate
  const systemAdminJoinBody: INotificationWorkflowSystemAdmin.IRequestJoin = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: `P@ssw0rd${RandomGenerator.alphaNumeric(4)}`,
  };
  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminJoinBody,
    });
  typia.assert(systemAdmin);

  // 2. Construct notification workflow creation body
  const workflowCreateBody: INotificationWorkflowWorkflow.ICreate = {
    code: `code_${RandomGenerator.alphaNumeric(12)}`,
    name: `Workflow ${RandomGenerator.alphaNumeric(8)}`,
    is_active: true,
    entry_node_id: typia.random<string & tags.Format<"uuid">>(),
    version: 1,
  };

  // 3. Create notification workflow
  const workflowResponse: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.create(
      connection,
      {
        body: workflowCreateBody,
      },
    );
  typia.assert(workflowResponse);

  // 4. Validate the response fields against creation request
  TestValidator.predicate(
    "workflow id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      workflowResponse.id,
    ),
  );
  TestValidator.equals(
    "workflow code matches",
    workflowResponse.code,
    workflowCreateBody.code,
  );
  TestValidator.equals(
    "workflow name matches",
    workflowResponse.name,
    workflowCreateBody.name,
  );
  TestValidator.equals(
    "workflow is_active is true",
    workflowResponse.is_active,
    true,
  );
  TestValidator.equals(
    "workflow entry_node_id matches",
    workflowResponse.entry_node_id,
    workflowCreateBody.entry_node_id,
  );
  TestValidator.equals("workflow version is 1", workflowResponse.version, 1);
  TestValidator.predicate(
    "workflow created_at is a valid ISO8601 datetime",
    typeof workflowResponse.created_at === "string" &&
      workflowResponse.created_at.length > 0,
  );
  TestValidator.predicate(
    "workflow updated_at is a valid ISO8601 datetime",
    typeof workflowResponse.updated_at === "string" &&
      workflowResponse.updated_at.length > 0,
  );
  TestValidator.predicate(
    "workflow deleted_at is null or undefined",
    workflowResponse.deleted_at === null ||
      workflowResponse.deleted_at === undefined,
  );
}
