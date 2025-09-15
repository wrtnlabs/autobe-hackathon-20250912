import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingRegularUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

export async function test_api_regularuser_regularusers_index_success(
  connection: api.IConnection,
) {
  // 1. Create a regular user to establish authentication and create user data
  const createUserBody = {
    email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    username: RandomGenerator.name(2),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: createUserBody,
    });
  typia.assert(authorizedUser);

  // 2. Prepare request body for listing regular users with pagination
  const listRequestBody = {
    page: 0,
    limit: 10,
    email: null,
    username: null,
  } satisfies IRecipeSharingRegularUser.IRequest;

  // 3. Execute the listing API
  const listResponse: IPageIRecipeSharingRegularUser.ISummary =
    await api.functional.recipeSharing.regularUser.regularUsers.index(
      connection,
      {
        body: listRequestBody,
      },
    );
  typia.assert(listResponse);

  // 4. Validate the presence of the authorized user in list
  const includedUser = listResponse.data.find(
    (user) =>
      user.email === authorizedUser.email &&
      user.username === authorizedUser.username,
  );
  TestValidator.predicate(
    `should include authorized user in list`,
    includedUser !== undefined && includedUser !== null,
  );

  // 5. Validate pagination information
  TestValidator.equals(
    `pagination current page is 0`,
    listResponse.pagination.current,
    0,
  );
  TestValidator.equals(
    `pagination limit is 10`,
    listResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    `pagination records count should not be negative`,
    listResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    `pagination pages count is records/limit rounded up`,
    listResponse.pagination.pages ===
      Math.ceil(
        listResponse.pagination.records / listResponse.pagination.limit,
      ),
  );
}
