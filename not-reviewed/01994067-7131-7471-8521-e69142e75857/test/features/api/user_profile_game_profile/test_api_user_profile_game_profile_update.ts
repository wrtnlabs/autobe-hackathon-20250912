import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerUserGameProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserGameProfile";
import type { IOauthServerUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserProfile";

/**
 * This end-to-end test validates the workflow of updating an existing user game
 * profile for a member user in the OAuth server system.
 *
 * It performs the following steps:
 *
 * 1. Registers a new member user with valid email and password.
 * 2. Logs in the member user to acquire authentication tokens.
 * 3. Creates a member user entity linked to the OAuth server.
 * 4. Creates a user profile linked to the member user.
 * 5. Creates a user game profile under the user profile.
 * 6. Updates the created game profile by modifying the platform and player name.
 * 7. Validates that the updated game profile matches the input and remains linked
 *    to the correct user profile.
 * 8. Tests unauthorized update rejection by attempting an update without
 *    authentication.
 * 9. Tests rejection of updates with invalid UUID path parameters.
 *
 * This test ensures authentication and authorization enforcement, UUID
 * parameter validation, business logic correctness, and data integrity for
 * nested entities.
 */
export async function test_api_user_profile_game_profile_update(
  connection: api.IConnection,
) {
  // 1. Register a member user by joining
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IOauthServerMember.ICreate;
  const joinResult: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(joinResult);

  // 2. Login the member user
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IOauthServerMember.ILogin;
  const loginResult: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.login(connection, { body: loginBody });
  typia.assert(loginResult);

  // 3. Create OAuth Server Member User entity
  const memberCreateBody = {
    email: joinResult.email,
    password: joinBody.password,
  } satisfies IOauthServerMember.ICreate;
  const memberUser: IOauthServerMember =
    await api.functional.oauthServer.oauthServerMembers.create(connection, {
      body: memberCreateBody,
    });
  typia.assert(memberUser);

  // 4. Create User Profile linked to the member user
  const userProfileCreateBody = {
    user_id: memberUser.id,
    nickname: RandomGenerator.name(),
    profile_picture_url: null,
    biography: null,
  } satisfies IOauthServerUserProfile.ICreate;
  const userProfile: IOauthServerUserProfile =
    await api.functional.oauthServer.member.userProfiles.create(connection, {
      body: userProfileCreateBody,
    });
  typia.assert(userProfile);

  // 5. Create User Game Profile for the user profile
  const gameProfileCreateBody = {
    user_profile_id: userProfile.id,
    platform: RandomGenerator.pick([
      "pubg",
      "kakao_pubg",
      "league_of_legends",
    ] as const),
    player_name: RandomGenerator.name(),
    season: null,
  } satisfies IOauthServerUserGameProfile.ICreate;
  const gameProfile: IOauthServerUserGameProfile =
    await api.functional.oauthServer.member.userProfiles.gameProfiles.create(
      connection,
      {
        userProfileId: userProfile.id,
        body: gameProfileCreateBody,
      },
    );
  typia.assert(gameProfile);

  // 6. Update the User Game Profile
  const updateBody = {
    platform: RandomGenerator.pick([
      "pubg",
      "kakao_pubg",
      "league_of_legends",
    ] as const),
    player_name: RandomGenerator.name(),
  } satisfies IOauthServerUserGameProfile.IUpdate;
  const updatedGameProfile: IOauthServerUserGameProfile =
    await api.functional.oauthServer.member.userProfiles.gameProfiles.update(
      connection,
      {
        userProfileId: userProfile.id,
        id: gameProfile.id,
        body: updateBody,
      },
    );
  typia.assert(updatedGameProfile);

  // Validate that the updated profile has the changes
  TestValidator.equals(
    "user_profile_id matches",
    updatedGameProfile.user_profile_id,
    userProfile.id,
  );
  TestValidator.equals(
    "platform is updated",
    updatedGameProfile.platform,
    updateBody.platform,
  );
  TestValidator.equals(
    "player_name is updated",
    updatedGameProfile.player_name,
    updateBody.player_name,
  );

  // 7. Attempt update with unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized update should be rejected",
    async () => {
      await api.functional.oauthServer.member.userProfiles.gameProfiles.update(
        unauthConn,
        {
          userProfileId: userProfile.id,
          id: gameProfile.id,
          body: updateBody,
        },
      );
    },
  );

  // 8. Attempt update with invalid UUID path parameters
  const invalidUserProfileId = "invalid-uuid";
  const invalidGameProfileId = "also-invalid-uuid";
  await TestValidator.error(
    "update with invalid UUID path parameters should be rejected",
    async () => {
      await api.functional.oauthServer.member.userProfiles.gameProfiles.update(
        connection,
        {
          userProfileId: invalidUserProfileId,
          id: invalidGameProfileId,
          body: updateBody,
        },
      );
    },
  );
}
