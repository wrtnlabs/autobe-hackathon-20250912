import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";

/**
 * Test member login with valid credentials.
 *
 * This test first creates a new member using the /auth/member/join
 * endpoint, then verifies that logging in with the created member's
 * credentials returns a valid authorized member response containing JWT
 * tokens.
 *
 * Failure cases test invalid internal_sender_id and nickname, as well as
 * empty credentials, to confirm that the login operation enforces security
 * correctly.
 *
 * Steps:
 *
 * 1. Create a new member user via join API with random internal_sender_id and
 *    nickname.
 * 2. Login using same credentials and validate returned data and tokens.
 * 3. Test login failure cases with incorrect or missing credentials.
 */
export async function test_api_member_login_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1. Create a new member user
  const memberCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;
  const createdMember: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberCreateBody,
    });
  typia.assert(createdMember);

  // 2. Login with valid credentials
  const loginBody = {
    internal_sender_id: createdMember.internal_sender_id,
    nickname: createdMember.nickname,
  } satisfies IChatbotMember.ILogin;
  const authorizedMember: IChatbotMember.IAuthorized =
    await api.functional.auth.member.login.loginMember(connection, {
      body: loginBody,
    });
  typia.assert(authorizedMember);
  TestValidator.equals(
    "member ID matches after login",
    authorizedMember.id,
    createdMember.id,
  );
  TestValidator.equals(
    "member nickname matches after login",
    authorizedMember.nickname,
    createdMember.nickname,
  );
  TestValidator.predicate(
    "access token is non-empty",
    authorizedMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorizedMember.token.refresh.length > 0,
  );

  // 3. Failure case: wrong internal_sender_id
  await TestValidator.error(
    "login fails with invalid internal_sender_id",
    async () => {
      await api.functional.auth.member.login.loginMember(connection, {
        body: {
          internal_sender_id: createdMember.internal_sender_id + "_wrong",
          nickname: createdMember.nickname,
        } satisfies IChatbotMember.ILogin,
      });
    },
  );

  // 4. Failure case: wrong nickname
  await TestValidator.error("login fails with invalid nickname", async () => {
    await api.functional.auth.member.login.loginMember(connection, {
      body: {
        internal_sender_id: createdMember.internal_sender_id,
        nickname: createdMember.nickname + "_wrong",
      } satisfies IChatbotMember.ILogin,
    });
  });

  // 5. Failure case: empty credentials
  await TestValidator.error("login fails with empty credentials", async () => {
    await api.functional.auth.member.login.loginMember(connection, {
      body: {
        internal_sender_id: "",
        nickname: "",
      } satisfies IChatbotMember.ILogin,
    });
  });
}
