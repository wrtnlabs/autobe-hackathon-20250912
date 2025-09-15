import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

/**
 * This test validates the complete flow of a regular user creation,
 * authentication, profile update, and verification in the chat application.
 *
 * It starts by creating a new regular user with a unique social_login_id and
 * nickname through the join API.
 *
 * Then, it authenticates that user to obtain the access token for connection
 * context.
 *
 * Next, it updates the user's profile using the update API, changing the
 * nickname and profile_image_uri, ensuring business rules compliance.
 *
 * Finally, it reads back the user profile (via update API response) and
 * validates that the social_login_id has not changed and updates are
 * persisted.
 */
export async function test_api_regular_user_profile_update_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new regular user with unique social_login_id and nickname
  const socialLoginId = `${RandomGenerator.alphaNumeric(12)}@snapchat`;
  const initialNickname = RandomGenerator.name(2);
  const initialProfileImageUri = `https://cdn.example.com/profiles/${RandomGenerator.alphaNumeric(10)}.jpg`;

  const createUserBody = {
    social_login_id: socialLoginId,
    nickname: initialNickname,
    profile_image_uri: initialProfileImageUri,
  } satisfies IChatAppRegularUser.ICreate;

  const joinedUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: createUserBody,
    });
  typia.assert(joinedUser);

  // Ensure returned data matches created data
  TestValidator.equals(
    "joined user social_login_id matches input",
    joinedUser.social_login_id,
    socialLoginId,
  );
  TestValidator.equals(
    "joined user nickname matches input",
    joinedUser.nickname,
    initialNickname,
  );
  TestValidator.equals(
    "joined user profile_image_uri matches input",
    joinedUser.profile_image_uri,
    initialProfileImageUri,
  );

  // Step 2: Authenticate the created user
  const loginBody = {
    social_login_id: socialLoginId,
  } satisfies IChatAppRegularUser.IRequestLogin;

  const loggedInUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // The JWT token is attached to connection.headers automatically by SDK

  // Step 3: Update the user's profile: modify nickname and profile_image_uri
  const newNickname = RandomGenerator.name(3);
  const newProfileImageUri = `https://cdn.example.com/profiles/${RandomGenerator.alphaNumeric(10)}.png`;

  const updateBody = {
    nickname: newNickname,
    profile_image_uri: newProfileImageUri,
  } satisfies IChatAppRegularUser.IUpdate;

  const updatedUser: IChatAppRegularUser =
    await api.functional.chatApp.regularUser.regularUsers.update(connection, {
      regularUserId: joinedUser.id,
      body: updateBody,
    });
  typia.assert(updatedUser);

  // Step 4: Validate the update response reflecting the changes
  TestValidator.equals(
    "updated user id matches original",
    updatedUser.id,
    joinedUser.id,
  );
  TestValidator.equals(
    "updated user social_login_id is immutable",
    updatedUser.social_login_id,
    socialLoginId,
  );
  TestValidator.equals(
    "updated user nickname is updated",
    updatedUser.nickname,
    newNickname,
  );
  TestValidator.equals(
    "updated user profile_image_uri is updated",
    updatedUser.profile_image_uri,
    newProfileImageUri,
  );

  // Step 5: Final validation - the updated user data should be consistent
  TestValidator.notEquals(
    "updated nickname differs from initial",
    updatedUser.nickname,
    initialNickname,
  );
  TestValidator.notEquals(
    "updated profile_image_uri differs from initial",
    updatedUser.profile_image_uri,
    initialProfileImageUri,
  );
}
