import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";

/**
 * E2E test that validates the deletion of a user profile by an
 * authenticated member.
 *
 * This test follows the real-world user journey:
 *
 * 1. A member user registers with email and password.
 * 2. The member logs in to obtain access tokens.
 * 3. The member deletes their user profile using the delete profile API.
 * 4. The test verifies that deleting the same profile again results in an
 *    error.
 * 5. The test verifies that deleting a random non-existent profile results in
 *    an error.
 *
 * It uses typia for strict runtime type validation and the SDK for API
 * calls. Authentication tokens are managed automatically within the SDK.
 * TestValidator assertions provide detailed validation messages.
 *
 * This test ensures the profile deletion API correctly performs soft
 * deletes and enforces proper error handling for repeated or invalid
 * deletion attempts.
 *
 * @param connection The API connection used for calling SDK functions
 */
export async function test_api_user_profile_deletion_with_authenticated_member(
  connection: api.IConnection,
) {
  // 1. Member registration
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IOauthServerMember.ICreate;
  const joinedMember = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(joinedMember);
  TestValidator.predicate(
    "Member join success with valid tokens",
    joinedMember.access_token !== undefined &&
      joinedMember.refresh_token !== undefined,
  );

  // Store the member ID to perform deletion
  const memberId = typia.assert<string & tags.Format<"uuid">>(joinedMember.id);

  // 2. Member login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IOauthServerMember.ILogin;
  const loggedInMember = await api.functional.auth.member.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedInMember);
  TestValidator.predicate(
    "Member login success with valid tokens",
    loggedInMember.access_token !== undefined &&
      loggedInMember.refresh_token !== undefined,
  );

  // 3. Delete the user profile by member ID
  await api.functional.oauthServer.member.userProfiles.erase(connection, {
    id: memberId,
  });

  // 4. Attempt to delete the same profile again, expecting an error
  await TestValidator.error(
    "Deleting already deleted profile throws error",
    async () => {
      await api.functional.oauthServer.member.userProfiles.erase(connection, {
        id: memberId,
      });
    },
  );

  // 5. Attempt to delete a random non-existent UUID profile, expecting an error
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Deleting non-existent profile throws error",
    async () => {
      await api.functional.oauthServer.member.userProfiles.erase(connection, {
        id: randomId,
      });
    },
  );
}
