import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerUserGameProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserGameProfile";
import type { IOauthServerUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserProfile";

export async function test_api_user_profile_game_profile_detail_access(
  connection: api.IConnection,
) {
  // 1. Generate first member user registration data
  const memberEmail1 = typia.random<string & tags.Format<"email">>();
  const memberPassword1 = "TestPass123!";

  // 2. Register first member user
  const member1: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail1,
        password: memberPassword1,
      } satisfies IOauthServerMember.ICreate,
    });
  typia.assert(member1);

  // 3. Login first member user
  const login1: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail1,
        password: memberPassword1,
      } satisfies IOauthServerMember.ILogin,
    });
  typia.assert(login1);

  // 4. Create OAuth server member user to get user_id
  const memberEmail2 = typia.random<string & tags.Format<"email">>();
  const memberPassword2 = "AnotherPass456!";
  const oauthMember: IOauthServerMember =
    await api.functional.oauthServer.oauthServerMembers.create(connection, {
      body: {
        email: memberEmail2,
        password: memberPassword2,
      } satisfies IOauthServerMember.ICreate,
    });
  typia.assert(oauthMember);

  // 5. Create user profile linked to OAuth member
  const userProfile: IOauthServerUserProfile =
    await api.functional.oauthServer.member.userProfiles.create(connection, {
      body: {
        user_id: oauthMember.id,
        nickname: null,
        profile_picture_url: null,
        biography: null,
      } satisfies IOauthServerUserProfile.ICreate,
    });
  typia.assert(userProfile);

  // 6. Create user game profile linked to user profile
  const gameProfileInput: IOauthServerUserGameProfile.ICreate = {
    user_profile_id: userProfile.id,
    platform: "test_game_platform",
    player_name: "test_player_name",
    season: null,
  };
  const gameProfile: IOauthServerUserGameProfile =
    await api.functional.oauthServer.member.userProfiles.gameProfiles.create(
      connection,
      {
        userProfileId: userProfile.id,
        body: gameProfileInput,
      },
    );
  typia.assert(gameProfile);

  // 7. Retrieve the game profile details
  const detail: IOauthServerUserGameProfile =
    await api.functional.oauthServer.member.userProfiles.gameProfiles.at(
      connection,
      {
        userProfileId: userProfile.id,
        id: gameProfile.id,
      },
    );
  typia.assert(detail);

  TestValidator.equals(
    "userProfileId matches",
    detail.user_profile_id,
    userProfile.id,
  );
  TestValidator.equals(
    "platform matches",
    detail.platform,
    gameProfile.platform,
  );
  TestValidator.equals(
    "playerName matches",
    detail.player_name,
    gameProfile.player_name,
  );

  // 8. Unauthorized retrieval without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access without token", async () => {
    await api.functional.oauthServer.member.userProfiles.gameProfiles.at(
      unauthConn,
      {
        userProfileId: userProfile.id,
        id: gameProfile.id,
      },
    );
  });

  // 9. Unauthorized retrieval with different user token
  // Register second member
  const member3Email = typia.random<string & tags.Format<"email">>();
  const member3Password = "DiffUserPass789!";
  const member3: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member3Email,
        password: member3Password,
      } satisfies IOauthServerMember.ICreate,
    });
  typia.assert(member3);

  // Login second member
  const member3Login: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: member3Email,
        password: member3Password,
      } satisfies IOauthServerMember.ILogin,
    });
  typia.assert(member3Login);

  // Create profile for second member
  const userProfile3: IOauthServerUserProfile =
    await api.functional.oauthServer.member.userProfiles.create(connection, {
      body: {
        user_id: member3.id,
        nickname: null,
        profile_picture_url: null,
        biography: null,
      } satisfies IOauthServerUserProfile.ICreate,
    });
  typia.assert(userProfile3);

  // Attempt to retrieve first user's game profile with second user's profile
  await TestValidator.error(
    "unauthorized access with different user token",
    async () => {
      await api.functional.oauthServer.member.userProfiles.gameProfiles.at(
        connection,
        {
          userProfileId: userProfile3.id,
          id: gameProfile.id,
        },
      );
    },
  );

  // 10. Test invalid UUID formats
  const malformedUUID = "invalid-uuid-format";

  await TestValidator.error("invalid userProfileId format", async () => {
    await api.functional.oauthServer.member.userProfiles.gameProfiles.at(
      connection,
      {
        userProfileId: malformedUUID,
        id: gameProfile.id,
      },
    );
  });

  await TestValidator.error("invalid gameProfile id format", async () => {
    await api.functional.oauthServer.member.userProfiles.gameProfiles.at(
      connection,
      {
        userProfileId: userProfile.id,
        id: malformedUUID,
      },
    );
  });
}
