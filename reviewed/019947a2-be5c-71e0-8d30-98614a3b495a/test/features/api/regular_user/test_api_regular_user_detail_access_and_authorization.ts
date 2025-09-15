import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

/**
 * This E2E test validates that a regular user can retrieve their own detailed
 * profile information and that unauthorized access, including unauthenticated
 * requests, or attempts to access another user's data, are properly forbidden.
 * It also verifies error handling for invalid or non-existent user IDs.
 *
 * The test simulates two distinct regular users, performs authentication, and
 * tests authorization boundaries, ensuring privacy compliance and JWT
 * authentication enforcement.
 */
export async function test_api_regular_user_detail_access_and_authorization(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first regular user
  const userCreateBody = {
    social_login_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    profile_image_uri: undefined,
  } satisfies IChatAppRegularUser.ICreate;

  const createdUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(createdUser);

  const loginBody = {
    social_login_id: createdUser.social_login_id,
  } satisfies IChatAppRegularUser.IRequestLogin;

  const loggedInUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // Step 2: Retrieve current user's info with authenticated connection
  const retrievedUser: IChatAppRegularUser =
    await api.functional.chatApp.regularUser.regularUsers.at(connection, {
      regularUserId: createdUser.id,
    });
  typia.assert(retrievedUser);

  TestValidator.equals(
    "retrieved user id matches",
    retrievedUser.id,
    createdUser.id,
  );
  TestValidator.equals(
    "retrieved user social_login_id matches",
    retrievedUser.social_login_id,
    createdUser.social_login_id,
  );
  TestValidator.equals(
    "retrieved user nickname matches",
    retrievedUser.nickname,
    createdUser.nickname,
  );
  TestValidator.equals(
    "retrieved user profile_image_uri matches",
    retrievedUser.profile_image_uri === undefined
      ? null
      : retrievedUser.profile_image_uri,
    createdUser.profile_image_uri === undefined
      ? null
      : createdUser.profile_image_uri,
  );
  TestValidator.equals(
    "retrieved user created_at matches",
    retrievedUser.created_at,
    createdUser.created_at,
  );
  TestValidator.equals(
    "retrieved user updated_at matches",
    retrievedUser.updated_at,
    createdUser.updated_at,
  );

  // Step 3: Attempt unauthenticated access (no auth token)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.chatApp.regularUser.regularUsers.at(unauthConnection, {
      regularUserId: createdUser.id,
    });
  });

  // Step 4: Create and authenticate second distinct user
  const secondUserCreateBody = {
    social_login_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    profile_image_uri: undefined,
  } satisfies IChatAppRegularUser.ICreate;

  const secondUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: secondUserCreateBody,
    });
  typia.assert(secondUser);

  const secondUserLoginBody = {
    social_login_id: secondUser.social_login_id,
  } satisfies IChatAppRegularUser.IRequestLogin;

  const loggedInSecondUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: secondUserLoginBody,
    });
  typia.assert(loggedInSecondUser);

  // Step 5: Build a new connection simulating logged in second user for authorization check
  const secondUserConnection: api.IConnection = {
    ...connection,
    headers: {
      Authorization: loggedInSecondUser.token.access,
    },
  };

  // Step 6: Attempt to retrieve first user's data with second user's token (should fail authorization)
  await TestValidator.error(
    "accessing another user's details should fail",
    async () => {
      await api.functional.chatApp.regularUser.regularUsers.at(
        secondUserConnection,
        {
          regularUserId: createdUser.id,
        },
      );
    },
  );

  // Step 7: Test invalid regularUserId format
  await TestValidator.error(
    "invalid regularUserId format should fail",
    async () => {
      await api.functional.chatApp.regularUser.regularUsers.at(connection, {
        regularUserId: "invalid-uuid-format",
      });
    },
  );

  // Step 8: Test non-existent regularUserId (valid UUID, not assigned to any user)
  const randomValidUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent regularUserId should fail",
    async () => {
      await api.functional.chatApp.regularUser.regularUsers.at(connection, {
        regularUserId: randomValidUUID,
      });
    },
  );
}
