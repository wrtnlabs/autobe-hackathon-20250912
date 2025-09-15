import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserProfile";

export async function test_api_user_profile_creation_with_authenticated_member(
  connection: api.IConnection,
) {
  // 1. Member user registration
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = "P@ssw0rd123";

  const joinBody = {
    email: email,
    password: password,
  } satisfies IOauthServerMember.ICreate;

  const joinResponse: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(joinResponse);

  // 2. Member user login
  const loginBody = {
    email: email,
    password: password,
  } satisfies IOauthServerMember.ILogin;

  const loginResponse: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.login(connection, { body: loginBody });
  typia.assert(loginResponse);

  // 3. Create user profile
  const userProfileCreateBody = {
    user_id: joinResponse.id,
    nickname: RandomGenerator.name(),
    profile_picture_url: `https://example.com/${RandomGenerator.alphaNumeric(10)}.png`,
    biography: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IOauthServerUserProfile.ICreate;

  const createdProfile: IOauthServerUserProfile =
    await api.functional.oauthServer.member.userProfiles.create(connection, {
      body: userProfileCreateBody,
    });
  typia.assert(createdProfile);

  // 4. Validate that created profile matches input
  TestValidator.equals(
    "userProfile user id matches",
    createdProfile.user_id,
    joinResponse.id,
  );
  TestValidator.equals(
    "userProfile nickname matches",
    createdProfile.nickname ?? null,
    userProfileCreateBody.nickname ?? null,
  );
  TestValidator.equals(
    "userProfile profile_picture_url matches",
    createdProfile.profile_picture_url ?? null,
    userProfileCreateBody.profile_picture_url ?? null,
  );
  TestValidator.equals(
    "userProfile biography matches",
    createdProfile.biography ?? null,
    userProfileCreateBody.biography ?? null,
  );

  // 5. Test unauthenticated creation attempt
  const unauthConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated user profile creation should fail",
    async () =>
      api.functional.oauthServer.member.userProfiles.create(unauthConnection, {
        body: userProfileCreateBody,
      }),
  );
}
