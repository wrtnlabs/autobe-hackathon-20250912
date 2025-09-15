import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEasySignFreelancerUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignFreelancerUser";

export async function test_api_freelancer_user_registration_and_token_issuance(
  connection: api.IConnection,
) {
  // 1. Generate a unique email address and a valid password
  const email = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const password = RandomGenerator.alphaNumeric(16);

  // 2. Successful registration with valid credentials
  const createBody = {
    email,
    password,
    nickname: null,
  } satisfies IEasySignFreelancerUser.ICreate;

  const authorized: IEasySignFreelancerUser.IAuthorized =
    await api.functional.auth.freelancerUser.join(connection, {
      body: createBody,
    });

  typia.assert(authorized);

  // Validate returned user id is UUID format
  typia.assert<string & tags.Format<"uuid">>(authorized.id);

  // Validate authorization token
  const token: IAuthorizationToken = authorized.token;
  typia.assert(token);

  // Validate token strings are non-empty
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  // Validate date-time formats for token expiration
  typia.assert<string & tags.Format<"date-time">>(token.expired_at);
  typia.assert<string & tags.Format<"date-time">>(token.refreshable_until);

  // 3. Error case: Attempt to register with the same email again
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.freelancerUser.join(connection, {
        body: {
          email,
          password: RandomGenerator.alphaNumeric(16),
          nickname: null,
        } satisfies IEasySignFreelancerUser.ICreate,
      });
    },
  );

  // 4. Error case: Attempt to register with invalid passwords (empty string and short password)
  const invalidPasswords = ["", "short"];
  for (const invalidPassword of invalidPasswords) {
    await TestValidator.error(
      `registration with invalid password '${invalidPassword}' should fail`,
      async () => {
        await api.functional.auth.freelancerUser.join(connection, {
          body: {
            email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
            password: invalidPassword,
            nickname: null,
          } satisfies IEasySignFreelancerUser.ICreate,
        });
      },
    );
  }
}
