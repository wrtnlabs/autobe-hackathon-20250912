import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingRegularUser";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/*
 * This test validates the successful retrieval of a paged listing of regular users
 * for a premiumUser. It covers the workflow including the prerequisite premiumUser
 * account creation (join) to establish authentication and token context. After
 * authentication as premiumUser is established, it performs a PATCH call to the
 * regularUser listing endpoint providing pagination and no filters. The test
 * confirms that the returned page data contains valid pagination details and a
 * non-null array of regular user summaries. It asserts the structure and correctness
 * of the response, including the presence of pagination and user data. This
 * ensures that only authorized premiumUsers can access the user listing and that
 * the API properly supports the listing functionality with pagination.
 */
export async function test_api_premiumuser_regularusers_index_success(
  connection: api.IConnection,
) {
  // 1. Create a premiumUser account using the join API
  const createBody = {
    email: `tester+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(3),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const authorizedUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: createBody,
    });
  typia.assert(authorizedUser);

  // 2. Construct a regular user search request with pagination parameters and null filters
  const requestBody = {
    page: 0,
    limit: 10,
    email: null,
    username: null,
  } satisfies IRecipeSharingRegularUser.IRequest;

  // 3. Call the patch endpoint to list regular users
  const pageResult: IPageIRecipeSharingRegularUser.ISummary =
    await api.functional.recipeSharing.premiumUser.regularUsers.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // 4. Validate pagination structure and data
  TestValidator.predicate(
    "pagination exists",
    pageResult.pagination !== null && pageResult.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination current page non-negative",
    pageResult.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit positive",
    pageResult.pagination.limit >= 1,
  );

  TestValidator.predicate(
    "pagination total pages non-negative",
    pageResult.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "pagination records count non-negative",
    pageResult.pagination.records >= 0,
  );

  // 5. Validate the array of user summaries
  TestValidator.predicate("data is an array", Array.isArray(pageResult.data));

  for (const userSummary of pageResult.data) {
    typia.assert(userSummary);
    TestValidator.predicate(
      `user id is non-empty UUID: ${userSummary.id}`,
      typeof userSummary.id === "string" && userSummary.id.length > 0,
    );
    TestValidator.predicate(
      `user email is a string: ${userSummary.email}`,
      typeof userSummary.email === "string" && userSummary.email.length > 0,
    );
    TestValidator.predicate(
      `user username is a string: ${userSummary.username}`,
      typeof userSummary.username === "string" &&
        userSummary.username.length > 0,
    );
  }
}
