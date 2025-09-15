import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementDesigner";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";

/**
 * The E2E test performs comprehensive developer authentication and tests
 * the designer listing API with pagination and filters.
 *
 * Steps:
 *
 * 1. Developer join: Creates a new developer with valid randomized data.
 * 2. Developer login: Logs in with the same credentials to refresh token.
 * 3. Authenticated request to designer index API with filtered queries, paging
 *    and sorting.
 * 4. Negative tests for unauthorized or invalid token requests.
 * 5. Validates correct token-based security and data responses.
 */
export async function test_api_designer_index_with_developer_authentication_and_pagination(
  connection: api.IConnection,
) {
  // 1. Developer join
  const createDeveloperBody = {
    email: `test${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(20),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDeveloper.ICreate;

  const authorizedDeveloper = await api.functional.auth.developer.join(
    connection,
    {
      body: createDeveloperBody,
    },
  );
  typia.assert(authorizedDeveloper);

  // 2. Developer login
  const loginDeveloperBody = {
    email: createDeveloperBody.email,
    password: createDeveloperBody.password_hash,
  } satisfies ITaskManagementDeveloper.ILogin;

  const loggedInDeveloper = await api.functional.auth.developer.login(
    connection,
    {
      body: loginDeveloperBody,
    },
  );
  typia.assert(loggedInDeveloper);

  // 3. Prepare designer index request body
  const requestBody = {
    email: authorizedDeveloper.email.substring(0, 5),
    name: RandomGenerator.name(),
    page: 1,
    limit: 10,
    sort: "email",
    order: "asc",
  } satisfies ITaskManagementDesigner.IRequest;

  // 4. Call designer index API
  const designerPage =
    await api.functional.taskManagement.developer.taskManagement.designers.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(designerPage);

  // Validate pagination data
  TestValidator.predicate(
    "pagination current page should be >= 0",
    designerPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be >= 0",
    designerPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    designerPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    designerPage.pagination.pages >= 0,
  );

  // Validate each designer data item
  for (const designer of designerPage.data) {
    TestValidator.predicate(
      "designer id should be valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        designer.id,
      ),
    );
    TestValidator.predicate(
      "designer email should contain request filter",
      designer.email.includes(requestBody.email),
    );
    TestValidator.predicate(
      "designer name should be string",
      typeof designer.name === "string",
    );
  }

  // 5. Negative Test: Attempt with invalid token
  const invalidConnection = {
    ...connection,
    headers: { Authorization: "Bearer invalidtoken" },
  };
  await TestValidator.error("invalid token should reject", async () => {
    await api.functional.taskManagement.developer.taskManagement.designers.index(
      invalidConnection,
      { body: requestBody },
    );
  });

  // 6. Negative Test: Attempt unauthenticated request
  const unauthConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated request should reject",
    async () => {
      await api.functional.taskManagement.developer.taskManagement.designers.index(
        unauthConnection,
        { body: requestBody },
      );
    },
  );
}
