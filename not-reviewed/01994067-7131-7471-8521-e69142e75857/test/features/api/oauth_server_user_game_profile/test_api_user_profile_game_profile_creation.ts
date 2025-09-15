import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerUserGameProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserGameProfile";
import type { IOauthServerUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserProfile";

export async function test_api_user_profile_game_profile_creation(
  connection: api.IConnection,
) {
  // 1. Register member user with valid email and password
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const password = "secure_password_123!";
  const joinResponse: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: password,
      } satisfies IOauthServerMember.ICreate,
    });
  typia.assert(joinResponse);

  // 2. Login member user to get tokens (authorization headers auto updated by SDK)
  const loginResponse: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: password,
      } satisfies IOauthServerMember.ILogin,
    });
  typia.assert(loginResponse);

  // 3. Create OAuth server member user to obtain user_id
  // Note: Only email and password are allowed in IOauthServerMember.ICreate
  const oauthMember =
    await api.functional.oauthServer.oauthServerMembers.create(connection, {
      body: {
        email: memberEmail,
        password: password,
      } satisfies IOauthServerMember.ICreate,
    });
  typia.assert(oauthMember);

  // 4. Create user profile linked to OAuth member user
  const userProfile =
    await api.functional.oauthServer.member.userProfiles.create(connection, {
      body: {
        user_id: oauthMember.id,
        nickname: RandomGenerator.name(),
        profile_picture_url: null,
        biography: null,
      } satisfies IOauthServerUserProfile.ICreate,
    });
  typia.assert(userProfile);

  // 5. Create game profile linked to user profile
  const platform = RandomGenerator.pick([
    "pubg",
    "kakao_pubg",
    "league_of_legends",
  ] as const);
  const playerName = RandomGenerator.alphaNumeric(10);
  const gameProfile =
    await api.functional.oauthServer.member.userProfiles.gameProfiles.create(
      connection,
      {
        userProfileId: userProfile.id,
        body: {
          user_profile_id: userProfile.id,
          platform: platform,
          player_name: playerName,
          season: null,
        } satisfies IOauthServerUserGameProfile.ICreate,
      },
    );
  typia.assert(gameProfile);
  TestValidator.equals(
    "Game profile user_profile_id matches",
    gameProfile.user_profile_id,
    userProfile.id,
  );
  TestValidator.equals(
    "Game profile platform matches",
    gameProfile.platform,
    platform,
  );
  TestValidator.equals(
    "Game profile player_name matches",
    gameProfile.player_name,
    playerName,
  );

  // 6. Attempt game profile creation with invalid token (unauthorized)
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthorized game profile creation should fail",
    async () => {
      await api.functional.oauthServer.member.userProfiles.gameProfiles.create(
        unauthenticatedConn,
        {
          userProfileId: userProfile.id,
          body: {
            user_profile_id: userProfile.id,
            platform: platform,
            player_name: playerName,
            season: null,
          } satisfies IOauthServerUserGameProfile.ICreate,
        },
      );
    },
  );

  // 7. Attempt game profile creation with missing required fields (empty strings)
  await TestValidator.error(
    "Game profile creation missing platform should fail",
    async () => {
      await api.functional.oauthServer.member.userProfiles.gameProfiles.create(
        connection,
        {
          userProfileId: userProfile.id,
          body: {
            user_profile_id: userProfile.id,
            platform: "",
            player_name: playerName,
            season: null,
          } satisfies IOauthServerUserGameProfile.ICreate,
        },
      );
    },
  );

  await TestValidator.error(
    "Game profile creation missing player_name should fail",
    async () => {
      await api.functional.oauthServer.member.userProfiles.gameProfiles.create(
        connection,
        {
          userProfileId: userProfile.id,
          body: {
            user_profile_id: userProfile.id,
            platform: platform,
            player_name: "",
            season: null,
          } satisfies IOauthServerUserGameProfile.ICreate,
        },
      );
    },
  );
}
