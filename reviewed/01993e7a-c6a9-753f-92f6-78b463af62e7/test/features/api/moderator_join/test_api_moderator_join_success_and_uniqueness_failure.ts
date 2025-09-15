import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

export async function test_api_moderator_join_success_and_uniqueness_failure(
  connection: api.IConnection,
) {
  // 1. Successful moderator registration with unique email and username
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = RandomGenerator.name(2);
  const passwordHash: string = RandomGenerator.alphaNumeric(32);

  const createBody = {
    email: moderatorEmail,
    password_hash: passwordHash,
    username: moderatorUsername,
  } satisfies IRecipeSharingModerator.ICreate;

  const authorized: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, { body: createBody });

  typia.assert(authorized);
  TestValidator.equals(
    "returned email matches input",
    authorized.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "returned username matches input",
    authorized.username,
    moderatorUsername,
  );
  TestValidator.predicate(
    "token access is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is non-empty",
    authorized.token.refresh.length > 0,
  );

  // 2. Attempt to register moderator again with same email -> expect failure
  await TestValidator.error(
    "registration fails with duplicate email",
    async () => {
      const duplicateEmailBody = {
        email: moderatorEmail,
        password_hash: RandomGenerator.alphaNumeric(32),
        username: RandomGenerator.name(2),
      } satisfies IRecipeSharingModerator.ICreate;
      await api.functional.auth.moderator.join(connection, {
        body: duplicateEmailBody,
      });
    },
  );

  // 3. Attempt to register moderator again with same username -> expect failure
  await TestValidator.error(
    "registration fails with duplicate username",
    async () => {
      const duplicateUsernameBody = {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
        username: moderatorUsername,
      } satisfies IRecipeSharingModerator.ICreate;
      await api.functional.auth.moderator.join(connection, {
        body: duplicateUsernameBody,
      });
    },
  );
}
