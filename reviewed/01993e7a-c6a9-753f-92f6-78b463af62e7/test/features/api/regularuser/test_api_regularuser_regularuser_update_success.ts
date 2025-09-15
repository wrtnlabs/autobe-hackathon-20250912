import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

export async function test_api_regularuser_regularuser_update_success(
  connection: api.IConnection,
) {
  // 1. Create a regular user account via join API
  const email: string = typia.random<string & tags.Format<"email">>();
  const username: string = RandomGenerator.name(2);
  const passwordHash: string = RandomGenerator.alphaNumeric(16);

  const createUserInput = {
    email,
    username,
    password_hash: passwordHash,
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: createUserInput,
    });
  typia.assert(authorizedUser);

  const userId = authorizedUser.id;

  // 2. Update the regular user's profile information
  //    - Update email, username, and optionally password_hash
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedUsername = RandomGenerator.name(3);
  const updatedPasswordHash = RandomGenerator.alphaNumeric(20);

  const updateUserBody = {
    email: updatedEmail,
    username: updatedUsername,
    password_hash: updatedPasswordHash,
  } satisfies IRecipeSharingRegularUser.IUpdate;

  // Actual update call
  const updatedUser: IRecipeSharingRegularUser =
    await api.functional.recipeSharing.regularUser.regularUsers.update(
      connection,
      {
        id: userId,
        body: updateUserBody,
      },
    );
  typia.assert(updatedUser);

  // Validate updated fields
  TestValidator.equals(
    "updated email should match",
    updatedUser.email,
    updatedEmail,
  );
  TestValidator.equals(
    "updated username should match",
    updatedUser.username,
    updatedUsername,
  );
  TestValidator.equals(
    "updated password_hash should match",
    updatedUser.password_hash,
    updatedPasswordHash,
  );
  TestValidator.equals(
    "user id should remain the same",
    updatedUser.id,
    userId,
  );

  // Validate timestamps: created_at should be earlier or same, updated_at should be later
  const originalCreatedAt = authorizedUser.created_at;
  const originalUpdatedAt = authorizedUser.updated_at;
  const updatedCreatedAt = updatedUser.created_at;
  const updatedUpdatedAt = updatedUser.updated_at;

  TestValidator.equals(
    "created_at should be unchanged",
    updatedCreatedAt,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at should be later than original",
    new Date(updatedUpdatedAt).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );

  // 3. Negative scenario: unauthorized role cannot update
  // Assuming an unauthenticated connection (empty headers)
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  const randomUserId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "unauthorized user cannot update profile",
    async () => {
      await api.functional.recipeSharing.regularUser.regularUsers.update(
        unauthenticatedConn,
        {
          id: userId,
          body: updateUserBody,
        },
      );
    },
  );

  // 4. Negative scenario: update non-existent user id results in error
  await TestValidator.error("update non-existent user fails", async () => {
    await api.functional.recipeSharing.regularUser.regularUsers.update(
      connection,
      {
        id: randomUserId,
        body: updateUserBody,
      },
    );
  });
}
