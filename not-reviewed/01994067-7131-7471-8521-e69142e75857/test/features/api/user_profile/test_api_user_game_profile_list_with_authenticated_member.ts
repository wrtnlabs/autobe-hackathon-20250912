import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerUserGameProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserGameProfile";
import type { IOauthServerUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerUserGameProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerUserGameProfile";

export async function test_api_user_game_profile_list_with_authenticated_member(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "P@ssw0rd123";
  const memberAuth: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IOauthServerMember.ICreate,
    });
  typia.assert(memberAuth);

  // 2. Login the member user to obtain authentication tokens
  const memberLogin: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IOauthServerMember.ILogin,
    });
  typia.assert(memberLogin);

  // 3. Create a user profile linked to the authenticated member user
  const userProfile: IOauthServerUserProfile =
    await api.functional.oauthServer.member.userProfiles.create(connection, {
      body: {
        user_id: memberAuth.id,
        nickname: RandomGenerator.name(2),
        profile_picture_url: null,
        biography: null,
      } satisfies IOauthServerUserProfile.ICreate,
    });
  typia.assert(userProfile);

  // 4. Retrieve a paginated list of game profiles linked to the user profile
  // with no filters, verifying empty result (assuming new profile has no game profiles yet)
  let gameProfilesPage: IPageIOauthServerUserGameProfile.ISummary =
    await api.functional.oauthServer.member.userProfiles.gameProfiles.index(
      connection,
      {
        userProfileId: userProfile.id,
        body: {
          user_profile_id: userProfile.id,
          platform: null,
          player_name: null,
          season: null,
          created_at: null,
          updated_at: null,
          deleted_at: null,
          page: 1,
          limit: 10,
          sort: null,
        } satisfies IOauthServerUserGameProfile.IRequest,
      },
    );
  typia.assert(gameProfilesPage);
  TestValidator.predicate(
    "empty game profiles list",
    ArrayUtil.has(gameProfilesPage.data, () => false),
  );

  // 5. Test querying with invalid userProfileId → expect error
  await TestValidator.error(
    "should fail with invalid userProfileId",
    async () => {
      await api.functional.oauthServer.member.userProfiles.gameProfiles.index(
        connection,
        {
          userProfileId: "00000000-0000-0000-0000-000000000000",
          body: {
            user_profile_id: "00000000-0000-0000-0000-000000000000",
            platform: null,
            player_name: null,
            season: null,
            created_at: null,
            updated_at: null,
            deleted_at: null,
            page: 1,
            limit: 10,
            sort: null,
          } satisfies IOauthServerUserGameProfile.IRequest,
        },
      );
    },
  );

  // 6. Since no game profiles exist, test filters on platform and season produce empty data
  gameProfilesPage =
    await api.functional.oauthServer.member.userProfiles.gameProfiles.index(
      connection,
      {
        userProfileId: userProfile.id,
        body: {
          user_profile_id: userProfile.id,
          platform: "pubg",
          player_name: null,
          season: "testSeason",
          created_at: null,
          updated_at: null,
          deleted_at: null,
          page: 1,
          limit: 10,
          sort: "created_at desc",
        } satisfies IOauthServerUserGameProfile.IRequest,
      },
    );
  typia.assert(gameProfilesPage);
  TestValidator.predicate(
    "filtered result is empty for non-existent platform and season",
    ArrayUtil.has(gameProfilesPage.data, () => false),
  );

  // 7. Verify unauthorized access is rejected
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.oauthServer.member.userProfiles.gameProfiles.index(
      unauthenticatedConnection,
      {
        userProfileId: userProfile.id,
        body: {
          user_profile_id: userProfile.id,
          platform: null,
          player_name: null,
          season: null,
          created_at: null,
          updated_at: null,
          deleted_at: null,
          page: 1,
          limit: 10,
          sort: null,
        } satisfies IOauthServerUserGameProfile.IRequest,
      },
    );
  });
}
