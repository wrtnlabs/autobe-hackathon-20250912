import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

/**
 * This E2E test validates the join (registration) operation of a regular user
 * via Snapchat social login using the /auth/regularUser/join POST endpoint. The
 * test fully exercises the API by including:
 *
 * - Success scenario: Creating a new user with a unique social_login_id and
 *   nickname, optionally including profile_image_uri.
 * - Failure scenarios: duplicate social_login_id, empty strings causing
 *   validation failures.
 *
 * The test ensures social_login_id uniqueness is enforced and validations
 * behave correctly, and verifies the structure of the authorized response
 * including JWT tokens.
 */
export async function test_api_regular_user_join_success_and_failure_cases(
  connection: api.IConnection,
) {
  // 1. Success case: Join a new regular user
  const socialLoginId = `snapchat_${RandomGenerator.alphaNumeric(12)}`;
  const nickname = RandomGenerator.name(2);
  const profileUri = `https://images.example.com/${RandomGenerator.alphaNumeric(8)}.png`;

  const createBody = {
    social_login_id: socialLoginId,
    nickname: nickname,
    profile_image_uri: profileUri,
  } satisfies IChatAppRegularUser.ICreate;

  const authorizedUser = await api.functional.auth.regularUser.join(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(authorizedUser);
  TestValidator.equals(
    "joined user's social_login_id matches",
    authorizedUser.social_login_id,
    socialLoginId,
  );
  TestValidator.equals(
    "joined user's nickname matches",
    authorizedUser.nickname,
    nickname,
  );
  TestValidator.predicate(
    "joined user has token with access string",
    typeof authorizedUser.token.access === "string" &&
      authorizedUser.token.access.length > 0,
  );

  // 2. Failure: duplicate social_login_id should throw error
  await TestValidator.error(
    "duplicate social_login_id should fail",
    async () => {
      await api.functional.auth.regularUser.join(connection, {
        body: {
          social_login_id: socialLoginId, // Duplicate
          nickname: RandomGenerator.name(2),
          profile_image_uri: null,
        } satisfies IChatAppRegularUser.ICreate,
      });
    },
  );

  // 3. Failure: missing social_login_id (empty string) should fail
  await TestValidator.error("empty social_login_id should fail", async () => {
    await api.functional.auth.regularUser.join(connection, {
      body: {
        social_login_id: "",
        nickname: RandomGenerator.name(2),
        profile_image_uri: null,
      } satisfies IChatAppRegularUser.ICreate,
    });
  });

  // 4. Failure: missing nickname (empty string) should fail
  await TestValidator.error("empty nickname should fail", async () => {
    await api.functional.auth.regularUser.join(connection, {
      body: {
        social_login_id: `snapchat_${RandomGenerator.alphaNumeric(10)}`,
        nickname: "",
        profile_image_uri: null,
      } satisfies IChatAppRegularUser.ICreate,
    });
  });

  // 5. Failure: null profile_image_uri explicitly allowed, test with null
  const createBodyWithNullProfile = {
    social_login_id: `snapchat_${RandomGenerator.alphaNumeric(10)}`,
    nickname: RandomGenerator.name(1),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;

  const authorizedUserWithNullProfile =
    await api.functional.auth.regularUser.join(connection, {
      body: createBodyWithNullProfile,
    });
  typia.assert(authorizedUserWithNullProfile);
  TestValidator.equals(
    "joined user's profile_image_uri is null as sent",
    authorizedUserWithNullProfile.profile_image_uri,
    null,
  );
}
