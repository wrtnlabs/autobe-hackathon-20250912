import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingUserTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingUserTags";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingUserTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserTags";

/**
 * Test retrieval failure of user-suggested tags list due to missing or
 * invalid authentication tokens.
 *
 * This test verifies that the PATCH /recipeSharing/regularUser/userTags
 * endpoint enforces authentication strictly. Unauthorized or
 * unauthenticated requests must return HTTP 401 errors.
 *
 * Workflow:
 *
 * 1. Register a new regular user (join) to setup the auth context.
 * 2. Attempt the user tags search endpoint without an authorization header.
 * 3. Attempt the user tags search endpoint with an invalid authorization
 *    token.
 * 4. Assert both attempts fail with authentication errors, preventing access.
 *
 * This ensures secure access control for sensitive user tag data.
 */
export async function test_api_user_tag_search_authentication_failure(
  connection: api.IConnection,
) {
  // 1. Register new regular user
  const userCreate = {
    email: `test${RandomGenerator.alphaNumeric(10)}@example.com`,
    username: `user${RandomGenerator.alphaNumeric(5)}`,
    password_hash: RandomGenerator.alphaNumeric(30),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const userAuth: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreate,
    });
  typia.assert(userAuth);

  // Prepare valid request body with all filter parameters null
  const searchRequest = {
    user_id: null,
    tag_id: null,
    suggested_name: null,
    status: null,
    page: null,
    limit: null,
    sort: null,
  } satisfies IRecipeSharingUserTags.IRequest;

  // 2. Call searchUserTags without authorization header
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "searchUserTags without auth token should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.userTags.searchUserTags(
        unauthenticatedConn,
        { body: searchRequest },
      );
    },
  );

  // 3. Call searchUserTags with invalid authorization token
  const invalidTokenConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer InvalidTokenExample1234" },
  };
  await TestValidator.error(
    "searchUserTags with invalid auth token should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.userTags.searchUserTags(
        invalidTokenConn,
        { body: searchRequest },
      );
    },
  );
}
