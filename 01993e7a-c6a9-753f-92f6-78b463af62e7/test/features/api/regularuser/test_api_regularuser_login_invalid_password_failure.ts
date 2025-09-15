import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

export async function test_api_regularuser_login_invalid_password_failure(
  connection: api.IConnection,
) {
  // 1. Create user with valid info
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password_hash: RandomGenerator.alphaNumeric(64),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser = await api.functional.auth.regularUser.join(
    connection,
    {
      body: createBody,
    },
  );

  typia.assert(authorizedUser);

  // 2. Attempt login with same email but invalid password_hash
  const invalidLoginBody = {
    email: authorizedUser.email,
    password_hash: RandomGenerator.alphaNumeric(64),
  } satisfies IRecipeSharingRegularUser.ILogin;

  await TestValidator.error(
    "login should fail with invalid password",
    async () => {
      await api.functional.auth.regularUser.login(connection, {
        body: invalidLoginBody,
      });
    },
  );
}
