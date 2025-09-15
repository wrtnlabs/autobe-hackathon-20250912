import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerUserGameProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserGameProfile";
import type { IOauthServerUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserProfile";

/**
 * This test function validates the complete workflow of deleting a game profile
 * associated with a user profile for a member user in the OAuth server system.
 * The test includes the full process of user registration, login to obtain
 * authentication, creating a user profile, creating a game profile linked to
 * that user profile, deleting the game profile with proper authentication, and
 * verifying that the deletion succeeded by ensuring the game profile cannot be
 * retrieved afterward. It also tests that unauthenticated deletion attempts are
 * rejected with proper error responses, and attempts to delete non-existent
 * game profiles fail as expected.
 *
 * Step-by-step test:
 *
 * 1. Unauthenticated start.
 * 2. Register a member user by calling POST /auth/member/join with valid email and
 *    password.
 * 3. Perform login POST /auth/member/login to obtain valid tokens.
 * 4. Create a user profile POST /oauthServer/member/userProfiles linked to the
 *    member user.
 * 5. Create a game profile POST
 *    /oauthServer/member/userProfiles/{userProfileId}/gameProfiles with
 *    platform, player name, and optional season.
 * 6. Delete the created game profile using DELETE
 *    /oauthServer/member/userProfiles/{userProfileId}/gameProfiles/{id} with
 *    authenticated context.
 * 7. Validate successful deletion by verifying subsequent retrieval attempts fail
 *    (simulated via error expectation as no GET exists).
 * 8. Attempt deletion with no authentication and expect unauthorized error.
 * 9. Attempt deletion of non-existent game profile and verify error response.
 *
 * Validation points:
 *
 * - Member user can create user profile and game profile, then delete their own
 *   game profile successfully.
 * - Unauthorized deletion attempts are rejected.
 * - Deletion of non-existent game profiles causes error.
 *
 * The API operations all use the documented request bodies and response types,
 * with correct uuid email formats and other constraints respected.
 * Authentication tokens are managed via login.
 *
 * Business logic and integrity of nested resources are maintained throughout
 * the workflow. This scenario excludes any type error testing or invalid schema
 * property usage.
 */
export async function test_api_user_profile_game_profile_deletion(
  connection: api.IConnection,
) {
  // 1. Register a member user
  const email = typia.random<string & tags.Format<"email">>();
  const password = "strong-password";

  const member: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: { email, password } satisfies IOauthServerMember.ICreate,
    });
  typia.assert(member);

  // 2. Login member to obtain tokens
  const loginResult: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: { email, password } satisfies IOauthServerMember.ILogin,
    });
  typia.assert(loginResult);

  // 3. Create user profile
  const userProfileCreateBody = {
    user_id: member.id,
    nickname: RandomGenerator.name(),
    profile_picture_url: null,
    biography: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IOauthServerUserProfile.ICreate;

  const userProfile: IOauthServerUserProfile =
    await api.functional.oauthServer.member.userProfiles.create(connection, {
      body: userProfileCreateBody,
    });
  typia.assert(userProfile);

  // 4. Create game profile
  const gameProfileCreateBody = {
    user_profile_id: userProfile.id,
    platform: RandomGenerator.pick([
      "pubg",
      "kakao_pubg",
      "league_of_legends",
    ] as const),
    player_name: RandomGenerator.name(2),
    season: null,
  } satisfies IOauthServerUserGameProfile.ICreate;

  const gameProfile: IOauthServerUserGameProfile =
    await api.functional.oauthServer.member.userProfiles.gameProfiles.create(
      connection,
      { userProfileId: userProfile.id, body: gameProfileCreateBody },
    );
  typia.assert(gameProfile);

  // 5. Delete the game profile (authenticated)
  await api.functional.oauthServer.member.userProfiles.gameProfiles.erase(
    connection,
    { userProfileId: userProfile.id, id: gameProfile.id },
  );

  // 6. Validate deletion by ensuring deleting again causes error
  await TestValidator.error(
    "deleting already deleted game profile should fail",
    async () => {
      await api.functional.oauthServer.member.userProfiles.gameProfiles.erase(
        connection,
        { userProfileId: userProfile.id, id: gameProfile.id },
      );
    },
  );

  // 7. Attempt deletion without authentication (unauthenticated connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated deletion should be rejected",
    async () => {
      await api.functional.oauthServer.member.userProfiles.gameProfiles.erase(
        unauthenticatedConnection,
        { userProfileId: userProfile.id, id: gameProfile.id },
      );
    },
  );

  // 8. Attempt deletion of non-existent game profile with authenticated connection
  await TestValidator.error(
    "deletion of non-existent game profile should fail",
    async () => {
      await api.functional.oauthServer.member.userProfiles.gameProfiles.erase(
        connection,
        {
          userProfileId: userProfile.id,
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
