import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowNodeTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowNodeTemplate";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";

export async function test_api_node_template_erase_for_system_admin_success_and_auth_failure(
  connection: api.IConnection,
) {
  // 1. System administrator registration and automatic login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Password123!";
  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(systemAdmin);

  // 2. Create a notification workflow node template
  const nodeTemplateBody = {
    code: `code-${RandomGenerator.alphaNumeric(8)}`,
    name: `name-${RandomGenerator.alphaNumeric(6)}`,
    type: RandomGenerator.pick(["email", "sms", "delay"] as const),
    template_body: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies INotificationWorkflowNodeTemplate.ICreate;
  const nodeTemplate: INotificationWorkflowNodeTemplate =
    await api.functional.notificationWorkflow.systemAdmin.nodeTemplates.create(
      connection,
      { body: nodeTemplateBody },
    );
  typia.assert(nodeTemplate);
  TestValidator.predicate(
    "Created node template id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      nodeTemplate.id,
    ),
  );

  // 3. Successful deletion of the created node template by authenticated system admin
  await api.functional.notificationWorkflow.systemAdmin.nodeTemplates.erase(
    connection,
    { nodeTemplateId: nodeTemplate.id },
  );

  // 4. Attempting to delete the same node template again should fail
  await TestValidator.error(
    "Deleting the same node template again should fail",
    async () => {
      await api.functional.notificationWorkflow.systemAdmin.nodeTemplates.erase(
        connection,
        { nodeTemplateId: nodeTemplate.id },
      );
    },
  );

  // 5. Test unauthorized deletion attempt with a new connection without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("Unauthorized deletion should fail", async () => {
    await api.functional.notificationWorkflow.systemAdmin.nodeTemplates.erase(
      unauthenticatedConnection,
      { nodeTemplateId: typia.random<string & tags.Format<"uuid">>() },
    );
  });
}
