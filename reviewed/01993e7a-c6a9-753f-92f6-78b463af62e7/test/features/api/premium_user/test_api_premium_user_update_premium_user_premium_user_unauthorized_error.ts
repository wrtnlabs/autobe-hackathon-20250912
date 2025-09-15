import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

export async function test_api_premium_user_update_premium_user_premium_user_unauthorized_error(
  connection: api.IConnection,
) {
  // Step 1: Register a premium user via join to obtain authenticated context
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "hashed_password_placeholder",
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const authorizedUser = await api.functional.auth.premiumUser.join(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(authorizedUser);

  // Step 2: Prepare update payload with optional fields
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    premium_since: new Date().toISOString(),
  } satisfies IRecipeSharingPremiumUser.IUpdate;

  // Step 3: Attempt update without authentication headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated update should throw unauthorized error",
    async () => {
      await api.functional.recipeSharing.premiumUser.premiumUsers.update(
        unauthenticatedConnection,
        {
          id: authorizedUser.id,
          body: updateBody,
        },
      );
    },
  );

  // Step 4: Attempt update with invalid authentication headers (simulate invalid auth)
  const invalidAuthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "invalid auth update should throw unauthorized error",
    async () => {
      await api.functional.recipeSharing.premiumUser.premiumUsers.update(
        invalidAuthConnection,
        {
          id: authorizedUser.id,
          body: updateBody,
        },
      );
    },
  );
}
