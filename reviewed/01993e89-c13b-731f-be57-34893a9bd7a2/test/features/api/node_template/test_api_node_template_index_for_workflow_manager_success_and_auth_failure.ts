import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowNodeTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowNodeTemplate";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowNodeTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowNodeTemplate";

/**
 * Test paginated listing and filtering of notification workflow node templates
 * by a workflow manager. First, create a workflow manager user to establish
 * authentication context using /auth/workflowManager/join. Authenticate if
 * switching users later. Then test PATCH
 * /notificationWorkflow/workflowManager/nodeTemplates to search and retrieve
 * node templates with pagination, filtering by node type such as email or sms,
 * and validating the paginated response data structure. Additionally, test the
 * failure case of accessing this endpoint without authentication to confirm
 * authorization enforcement.
 */
export async function test_api_node_template_index_for_workflow_manager_success_and_auth_failure(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a workflow manager user
  const workflowManagerCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
  } satisfies INotificationWorkflowWorkflowManager.ICreate;

  const workflowManagerAuthorized: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: workflowManagerCreateBody,
    });
  typia.assert(workflowManagerAuthorized);

  // 2. Test listing node templates without authentication (simulate unauthenticated connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("listing node templates unauthorized", async () => {
    await api.functional.notificationWorkflow.workflowManager.nodeTemplates.index(
      unauthenticatedConnection,
      {
        body: {},
      },
    );
  });

  // 3. Test listing node templates with valid pagination and filtering options

  // Basic listing with default pagination (empty body)
  const defaultListingResult =
    await api.functional.notificationWorkflow.workflowManager.nodeTemplates.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(defaultListingResult);
  TestValidator.predicate(
    "node template default listing has pagination",
    defaultListingResult.pagination !== null &&
      typeof defaultListingResult.pagination === "object",
  );
  TestValidator.predicate(
    "node template default listing data is an array",
    Array.isArray(defaultListingResult.data),
  );

  // Listing filtered by type = "email"
  const emailNodeListingResult =
    await api.functional.notificationWorkflow.workflowManager.nodeTemplates.index(
      connection,
      {
        body: {
          type: "email",
        } satisfies INotificationWorkflowNodeTemplate.IRequest,
      },
    );
  typia.assert(emailNodeListingResult);
  TestValidator.predicate(
    "node template listing filtered by email has pagination",
    emailNodeListingResult.pagination !== null &&
      typeof emailNodeListingResult.pagination === "object",
  );
  TestValidator.predicate(
    "node template listing filtered by email is an array",
    Array.isArray(emailNodeListingResult.data),
  );
  // Check all returned data elements have type "email"
  for (const nodeSummary of emailNodeListingResult.data) {
    TestValidator.equals(
      "node template type is email",
      nodeSummary.type,
      "email",
    );
  }

  // Listing filtered by type = "sms"
  const smsNodeListingResult =
    await api.functional.notificationWorkflow.workflowManager.nodeTemplates.index(
      connection,
      {
        body: {
          type: "sms",
        } satisfies INotificationWorkflowNodeTemplate.IRequest,
      },
    );
  typia.assert(smsNodeListingResult);
  TestValidator.predicate(
    "node template listing filtered by sms has pagination",
    smsNodeListingResult.pagination !== null &&
      typeof smsNodeListingResult.pagination === "object",
  );
  TestValidator.predicate(
    "node template listing filtered by sms is an array",
    Array.isArray(smsNodeListingResult.data),
  );
  // Check all returned data elements have type "sms"
  for (const nodeSummary of smsNodeListingResult.data) {
    TestValidator.equals("node template type is sms", nodeSummary.type, "sms");
  }

  // Listing filtered by type = "delay"
  const delayNodeListingResult =
    await api.functional.notificationWorkflow.workflowManager.nodeTemplates.index(
      connection,
      {
        body: {
          type: "delay",
        } satisfies INotificationWorkflowNodeTemplate.IRequest,
      },
    );
  typia.assert(delayNodeListingResult);
  TestValidator.predicate(
    "node template listing filtered by delay has pagination",
    delayNodeListingResult.pagination !== null &&
      typeof delayNodeListingResult.pagination === "object",
  );
  TestValidator.predicate(
    "node template listing filtered by delay is an array",
    Array.isArray(delayNodeListingResult.data),
  );
  // Check all returned data elements have type "delay"
  for (const nodeSummary of delayNodeListingResult.data) {
    TestValidator.equals(
      "node template type is delay",
      nodeSummary.type,
      "delay",
    );
  }

  // Listing with pagination: page = 1, limit = 5
  const paginatedResult =
    await api.functional.notificationWorkflow.workflowManager.nodeTemplates.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies INotificationWorkflowNodeTemplate.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedResult.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records at least 0",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages at least 0",
    paginatedResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "paginated data array length <= limit",
    paginatedResult.data.length <= 5,
  );
}
