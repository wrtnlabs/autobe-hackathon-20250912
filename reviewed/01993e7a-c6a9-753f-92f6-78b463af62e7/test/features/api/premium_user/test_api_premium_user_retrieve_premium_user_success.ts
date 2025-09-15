import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

/**
 * Successfully retrieve detailed information of a specific premium user by
 * ID when authorized as a premiumUser.
 *
 * The test authenticates by creating a premium user account via the join
 * API, then retrieves the premium user's profile using the
 * 'premiumUsers.at' API endpoint. It asserts that the retrieved profile
 * information matches the authorized user data, including email, username,
 * premium_since timestamp, and audit timestamps.
 *
 * This validates that authorized premium users can fetch their full profile
 * information correctly.
 */
export async function test_api_premium_user_retrieve_premium_user_success(
  connection: api.IConnection,
) {
  // 1. Create a premium user account via join API
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(40),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const authorizedUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: createBody,
    });
  typia.assert(authorizedUser);

  // 2. Retrieve the premium user by ID using premiumUsers.at API
  const premiumUser: IRecipeSharingPremiumUser =
    await api.functional.recipeSharing.premiumUser.premiumUsers.at(connection, {
      id: authorizedUser.id,
    });
  typia.assert(premiumUser);

  // 3. Validate the retrieved premium user's data matches the authorizedUser data
  TestValidator.equals(
    "premium user id match",
    premiumUser.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "premium user email match",
    premiumUser.email,
    authorizedUser.email,
  );
  TestValidator.equals(
    "premium user username match",
    premiumUser.username,
    authorizedUser.username,
  );
  TestValidator.equals(
    "premium_since timestamp match",
    premiumUser.premium_since,
    authorizedUser.premium_since,
  );
  TestValidator.equals(
    "created_at timestamp match",
    premiumUser.created_at,
    authorizedUser.created_at,
  );
  TestValidator.equals(
    "updated_at timestamp match",
    premiumUser.updated_at,
    authorizedUser.updated_at,
  );
  TestValidator.equals(
    "deleted_at match",
    premiumUser.deleted_at,
    authorizedUser.deleted_at,
  );
}
