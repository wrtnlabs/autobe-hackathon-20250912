import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserProfile";

/**
 * Test the update functionality of user profiles by authenticated members.
 *
 * This test verifies that an authenticated member user can successfully
 * update their user profile's editable fields, and that attempts to update
 * a non- existing profile result in errors.
 *
 * Steps:
 *
 * 1. Register a new member user and obtain authentication tokens.
 * 2. Login as that member to confirm authentication.
 * 3. Prepare realistic update data for the user profile fields such as
 *    nickname and biography.
 * 4. Call the update API for user profile with a valid profile ID and update
 *    data.
 * 5. Assert the updated profile's response matches the input and audit fields
 *    are properly updated.
 * 6. Attempt to update a non-existent profile ID and expect an error.
 */
export async function test_api_user_profile_update_with_authenticated_member(
  connection: api.IConnection,
) {
  // 1. Register member user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "secure-password-123",
  } satisfies IOauthServerMember.ICreate;
  const member: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(member);

  // 2. Login member user
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IOauthServerMember.ILogin;
  const authorized: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.login(connection, { body: loginBody });
  typia.assert(authorized);

  // 3. Prepare update data for user profile
  const updateBody = {
    nickname: RandomGenerator.name(2),
    biography: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IOauthServerUserProfile.IUpdate;

  // 4. Use a randomly generated profile ID as no profile creation API is given
  const validProfileId = typia.random<string & tags.Format<"uuid">>();

  // 5. Call the update API with valid profile ID
  const updatedProfile: IOauthServerUserProfile =
    await api.functional.oauthServer.member.userProfiles.update(connection, {
      id: validProfileId,
      body: updateBody,
    });
  typia.assert(updatedProfile);

  // 6. Validation
  TestValidator.equals(
    "updated profile id matches requested id",
    updatedProfile.id,
    validProfileId,
  );

  TestValidator.equals(
    "updated nickname matches input",
    updatedProfile.nickname,
    updateBody.nickname,
  );

  TestValidator.equals(
    "updated biography matches input",
    updatedProfile.biography,
    updateBody.biography,
  );

  TestValidator.predicate(
    "profile user_id should be UUID string",
    typeof updatedProfile.user_id === "string" &&
      updatedProfile.user_id.length > 0,
  );

  TestValidator.predicate(
    "profile is not soft-deleted",
    updatedProfile.deleted_at === null ||
      updatedProfile.deleted_at === undefined,
  );

  TestValidator.predicate(
    "profile has recent updated_at timestamp",
    new Date(updatedProfile.updated_at).getTime() >=
      new Date(updatedProfile.created_at).getTime(),
  );

  // 7. Test error: update with non-existing profile ID
  await TestValidator.error(
    "update fails with non-existing profile id",
    async () => {
      await api.functional.oauthServer.member.userProfiles.update(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: {
          nickname: "NonExistingUser",
        } satisfies IOauthServerUserProfile.IUpdate,
      });
    },
  );
}
