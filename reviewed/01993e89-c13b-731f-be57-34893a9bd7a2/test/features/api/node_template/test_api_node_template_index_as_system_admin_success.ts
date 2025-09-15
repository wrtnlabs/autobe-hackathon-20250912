import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowNodeTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowNodeTemplate";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowNodeTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowNodeTemplate";

/**
 * This test validates that a system administrator user can successfully
 * perform a paginated search of notification workflow node templates using
 * the PATCH /notificationWorkflow/systemAdmin/nodeTemplates API endpoint.
 *
 * The test includes creating a new system administrator user,
 * authenticating with the system to obtain an access token, and then
 * invoking the node template listing endpoint with filtering criteria.
 *
 * It verifies that the paginated response is returned correctly, includes
 * valid pagination metadata, and that the node template summaries conform
 * exactly to the expected schema.
 *
 * This ensures that the system admin role has appropriate access and
 * filtering capabilities as per business logic.
 *
 * Steps:
 *
 * 1. Create and authenticate as system administrator (POST
 *    /auth/systemAdmin/join).
 * 2. Use the authenticated context to call PATCH
 *    /notificationWorkflow/systemAdmin/nodeTemplates with filters.
 * 3. Validate that the response contains valid paginated summary data matching
 *    filtering criteria.
 * 4. Confirm pagination metadata integrity and element structure conformity.
 */
export async function test_api_node_template_index_as_system_admin_success(
  connection: api.IConnection,
) {
  // Step 1: Create system admin user and authenticate
  const joinRequest = {
    email: `sysadmin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "Password123!",
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;

  const adminAuth: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(adminAuth);

  // Step 2: Prepare node template search request with realistic filters
  const possibleTypes = ["email", "sms", "delay"] as const;
  const requestBody = {
    page: 1,
    limit: 10,
    search: RandomGenerator.substring(
      "notification workflow template example testing search term",
    ),
    type: RandomGenerator.pick(possibleTypes),
  } satisfies INotificationWorkflowNodeTemplate.IRequest;

  // Step 3: Call the node template listing API
  const listResponse: IPageINotificationWorkflowNodeTemplate.ISummary =
    await api.functional.notificationWorkflow.systemAdmin.nodeTemplates.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(listResponse);

  // Step 4: Validate pagination metadata properties
  const pagination: IPage.IPagination = listResponse.pagination;

  TestValidator.predicate(
    "pagination current page is positive integer",
    typeof pagination.current === "number" && pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive integer",
    typeof pagination.limit === "number" && pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative integer",
    typeof pagination.records === "number" && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is positive integer",
    typeof pagination.pages === "number" && pagination.pages >= 0,
  );

  // Step 5: Validate that data array elements conform to summary schema
  for (const templateSummary of listResponse.data) {
    typia.assert(templateSummary);
    TestValidator.predicate(
      "template id has uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        templateSummary.id,
      ),
    );
    TestValidator.predicate(
      "template code is string",
      typeof templateSummary.code === "string",
    );
    TestValidator.predicate(
      "template name is string",
      typeof templateSummary.name === "string",
    );
    TestValidator.predicate(
      "template type is valid",
      possibleTypes.includes(templateSummary.type as any),
    );
  }

  // Step 6: Confirm filtering is respected
  if (requestBody.search !== null && requestBody.search !== undefined) {
    TestValidator.predicate(
      "at least one template has search string in code or name",
      listResponse.data.some(
        (node) =>
          node.code.includes(requestBody.search!) ||
          node.name.includes(requestBody.search!),
      ),
    );
  }
  if (requestBody.type !== null && requestBody.type !== undefined) {
    TestValidator.predicate(
      "all templates have matching type",
      listResponse.data.every((node) => node.type === requestBody.type),
    );
  }
}
