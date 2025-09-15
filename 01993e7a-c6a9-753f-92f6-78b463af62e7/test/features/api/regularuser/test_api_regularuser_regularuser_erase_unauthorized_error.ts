import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

export async function test_api_regularuser_regularuser_erase_unauthorized_error(
  connection: api.IConnection,
) {
  // 1. Create a new regular user by join operation
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.alphaNumeric(12),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const createdUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(createdUser);

  // 2. Attempt to erase the user without proper authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized erase should fail", async () => {
    await api.functional.recipeSharing.regularUser.regularUsers.erase(
      unauthenticatedConnection,
      {
        id: createdUser.id,
      },
    );
  });
}
