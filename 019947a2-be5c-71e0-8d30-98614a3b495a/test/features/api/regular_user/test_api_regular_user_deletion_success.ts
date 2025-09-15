import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

export async function test_api_regular_user_deletion_success(
  connection: api.IConnection,
) {
  // 1. Register a new regular user
  const createBody = {
    social_login_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;
  const authorizedUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: createBody,
    });
  typia.assert(authorizedUser);

  // 2. Authenticate the created user
  const loginBody = {
    social_login_id: authorizedUser.social_login_id,
  } satisfies IChatAppRegularUser.IRequestLogin;
  const loginResult: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  // 3. Delete the user
  await api.functional.chatApp.regularUser.regularUsers.erase(connection, {
    regularUserId: authorizedUser.id,
  });

  // 4. Verify user deletion - attempt to login will fail
  await TestValidator.error("login should fail for deleted user", async () => {
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  });

  // 5. Attempt to delete a non-existent user ID
  const fakeUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent user should fail",
    async () => {
      await api.functional.chatApp.regularUser.regularUsers.erase(connection, {
        regularUserId: fakeUserId,
      });
    },
  );
}
