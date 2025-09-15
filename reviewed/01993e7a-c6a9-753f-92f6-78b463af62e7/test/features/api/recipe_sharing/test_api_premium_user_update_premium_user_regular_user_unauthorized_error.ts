import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

export async function test_api_premium_user_update_premium_user_regular_user_unauthorized_error(
  connection: api.IConnection,
) {
  /** 1. Join a regular user to establish context */
  const regularUserJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedRegularUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: regularUserJoinBody,
    });
  typia.assert(authorizedRegularUser);

  /** 2. Prepare an update body with realistic fields; all optional and nullable */
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(2),
    premium_since: new Date().toISOString(),
  } satisfies IRecipeSharingPremiumUser.IUpdate;

  /**
   * 3. Attempt to update a premium user without proper authentication (simulate by
   *    using the original connection without login/auth token setup) Expect
   *    error due to unauthorized access.
   */
  await TestValidator.error(
    "update premium user without auth should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.premiumUsers.update(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
}
