import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test retrieving detailed information of a premium user by ID with regularUser
 * authentication.
 *
 * The test performs the following steps:
 *
 * 1. Create and authenticate a regularUser.
 * 2. Create a premiumUser.
 * 3. Using the regularUser's authenticated context, retrieve premiumUser details
 *    by ID.
 * 4. Validate the premiumUser response data is correct and complete.
 * 5. Test failure scenarios for unauthorized access and invalid ID usage.
 */
export async function test_api_premium_user_detail_retrieval_with_regularuser_authentication(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a regularUser
  const regularUserCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const regularUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: regularUserCreate,
    });
  typia.assert(regularUser);

  // 2. Create a premiumUser
  const premiumUserCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: premiumUserCreate,
    });
  typia.assert(premiumUser);

  // 3. Using the regularUser context, retrieve premiumUser details by ID
  // (the same connection is authenticated as regularUser due to previous join call)
  const premiumUserDetails: IRecipeSharingPremiumUser =
    await api.functional.recipeSharing.regularUser.premiumUsers.at(connection, {
      id: premiumUser.id,
    });
  typia.assert(premiumUserDetails);

  // 4. Validate the premiumUser response data
  TestValidator.equals(
    "premium user id should match",
    premiumUserDetails.id,
    premiumUser.id,
  );
  TestValidator.equals(
    "premium user email should match",
    premiumUserDetails.email,
    premiumUserCreate.email,
  );
  TestValidator.equals(
    "premium user password_hash should match",
    premiumUserDetails.password_hash,
    premiumUserCreate.password_hash,
  );
  TestValidator.equals(
    "premium user username should match",
    premiumUserDetails.username,
    premiumUserCreate.username,
  );
  TestValidator.predicate(
    "premium_since is a valid ISO 8601 datetime string",
    typeof premiumUserDetails.premium_since === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(
        premiumUserDetails.premium_since,
      ),
  );
  TestValidator.predicate(
    "created_at is a valid ISO 8601 datetime string",
    typeof premiumUserDetails.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(
        premiumUserDetails.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO 8601 datetime string",
    typeof premiumUserDetails.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(
        premiumUserDetails.updated_at,
      ),
  );
  TestValidator.predicate(
    "deleted_at is null or valid ISO 8601 datetime string",
    premiumUserDetails.deleted_at === null ||
      (typeof premiumUserDetails.deleted_at === "string" &&
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(
          premiumUserDetails.deleted_at,
        )),
  );

  // 5. Failure scenarios
  // 5.1 Unauthorized access - unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access without authentication",
    async () => {
      await api.functional.recipeSharing.regularUser.premiumUsers.at(
        unauthConn,
        { id: premiumUser.id },
      );
    },
  );

  // 5.2 Invalid ID format (bad UUID)
  await TestValidator.error(
    "error when retrieving with invalid UUID format",
    async () => {
      await api.functional.recipeSharing.regularUser.premiumUsers.at(
        connection,
        {
          id: "invalid-uuid-format",
        } as any /* We do this cast here since compiler would error */,
      );
    },
  );

  // 5.3 Non-existing user ID (random UUID)
  const randomId = typia.random<string & tags.Format<"uuid">>();
  if (randomId !== premiumUser.id) {
    await TestValidator.error(
      "error when retrieving with non-existing user ID",
      async () => {
        await api.functional.recipeSharing.regularUser.premiumUsers.at(
          connection,
          {
            id: randomId,
          },
        );
      },
    );
  }
}
