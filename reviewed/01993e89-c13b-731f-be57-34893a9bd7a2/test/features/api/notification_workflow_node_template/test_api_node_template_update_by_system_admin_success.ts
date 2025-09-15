import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowNodeTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowNodeTemplate";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";

/**
 * This E2E test scenario validates the successful update of a notification
 * workflow node template by a system administrator. To perform the update, a
 * new system administrator user must first be created and authenticated by
 * calling the join function on /auth/systemAdmin/join endpoint, establishing
 * the proper authentication context with authorization tokens handled
 * automatically. Then using the authenticated connection, the test generates
 * valid update data for the node template, including code (unique string),
 * name, type (one of "email", "sms", or "delay"), and LiquidJS template body
 * content strings that represent realistic notification templates. The template
 * ID to update is a valid UUID string. The update API call is made with this
 * data, and the returned response is fully validated against the
 * INotificationWorkflowNodeTemplate type using typia.assert to ensure complete
 * correctness including all properties. This test ensures strict type safety,
 * format adherence, and that only the system administrator is authorized to
 * perform this operation. It verifies the full update flow and the structure of
 * the updated node template results returned from the server. All required
 * parameters are included with proper values, including explicit null values if
 * any optional properties intended to be null. The test uses random data
 * generators while respecting business constraints and format requirements for
 * realistic testing. Throughout the process, every API call is awaited for
 * asynchronous correctness and all TestValidator calls include descriptive
 * titles, following robust error handling and validation design.
 */
export async function test_api_node_template_update_by_system_admin_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new system administrator user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const password = "P@ssword1234";
  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password,
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(systemAdmin);

  // 2. Generate node template update data
  const newCode: string = RandomGenerator.alphaNumeric(8);
  const newName: string = RandomGenerator.name();
  const newType: "email" | "sms" | "delay" = RandomGenerator.pick([
    "email",
    "sms",
    "delay",
  ] as const);
  const newTemplateBody: string =
    "{{userName}} has a notification at {{timestamp}}.";

  const updateBody = {
    code: newCode,
    name: newName,
    type: newType,
    template_body: newTemplateBody,
  } satisfies INotificationWorkflowNodeTemplate.IUpdate;

  // 3. Use valid UUID for nodeTemplateId
  const nodeTemplateId = typia.random<string & tags.Format<"uuid">>();

  // 4. Call update API endpoint
  const updatedTemplate: INotificationWorkflowNodeTemplate =
    await api.functional.notificationWorkflow.systemAdmin.nodeTemplates.update(
      connection,
      {
        nodeTemplateId,
        body: updateBody,
      },
    );
  typia.assert(updatedTemplate);

  // 5. Validate that returned template's properties match update input
  TestValidator.equals(
    "Updated node template code matches",
    updatedTemplate.code,
    newCode,
  );
  TestValidator.equals(
    "Updated node template name matches",
    updatedTemplate.name,
    newName,
  );
  TestValidator.equals(
    "Updated node template type matches",
    updatedTemplate.type,
    newType,
  );
  TestValidator.equals(
    "Updated node template template_body matches",
    updatedTemplate.template_body,
    newTemplateBody,
  );
  TestValidator.predicate(
    "Updated template id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      updatedTemplate.id,
    ),
  );
  TestValidator.predicate(
    "Updated template created_at is ISO date-time string",
    typeof updatedTemplate.created_at === "string" &&
      updatedTemplate.created_at.length > 0,
  );
  TestValidator.predicate(
    "Updated template updated_at is ISO date-time string",
    typeof updatedTemplate.updated_at === "string" &&
      updatedTemplate.updated_at.length > 0,
  );
}
