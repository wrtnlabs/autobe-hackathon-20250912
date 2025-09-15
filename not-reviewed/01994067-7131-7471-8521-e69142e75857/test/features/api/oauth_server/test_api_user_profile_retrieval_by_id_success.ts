import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserProfile";

/**
 * This end-to-end test function validates the retrieval of a member user
 * profile by its unique ID.
 *
 * It covers the sequence of member registration (join), login, and the
 * authorized retrieval of the user profile. The test asserts correctness of
 * authentication tokens, user identifiers, and user profile properties
 * including optional nickname and biography.
 *
 * The test ensures the API responses adhere strictly to defined DTO schemas,
 * and it emphasizes that only schema-allowed properties exist. It also tests
 * handling of authentication context and confirms UUID format compliance.
 *
 * Steps:
 *
 * 1. Member user registers via the join endpoint with random realistic
 *    credentials.
 * 2. Member user logs in via the login endpoint to authenticate and receive JWT
 *    tokens.
 * 3. Retrieve the user profile using the userProfiles.at endpoint with the created
 *    user's profile ID.
 * 4. Assert the presence, types, and values of expected profile properties.
 * 5. Verify all required and optional fields are correctly populated or explicitly
 *    null.
 */
export async function test_api_user_profile_retrieval_by_id_success(
  connection: api.IConnection,
) {
  // 1. Register a new member user to get authorized member info
  const email = typia.random<string & tags.Format<"email">>();
  const password = "StrongPassword123!";
  const authorizedMember: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
      } satisfies IOauthServerMember.ICreate,
    });
  typia.assert(authorizedMember);

  // 2. Login as the registered member to refresh authorization context
  const loggedInMember: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email,
        password,
      } satisfies IOauthServerMember.ILogin,
    });
  typia.assert(loggedInMember);

  // 3. Retrieve the user profile by the id returned in the member user info
  // NOTE: Assuming profile id equals member id as profile creation not shown in public APIs
  const userProfile: IOauthServerUserProfile =
    await api.functional.oauthServer.member.userProfiles.at(connection, {
      id: authorizedMember.id,
    });
  typia.assert(userProfile);

  // 4. Assertions on user profile properties
  TestValidator.equals(
    "profile id matches member id",
    userProfile.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "profile user_id matches member id",
    userProfile.user_id,
    authorizedMember.id,
  );

  // nickname, profile_picture_url, biography are optional nullable - check type and allow null
  TestValidator.predicate(
    "nickname is string or null or undefined",
    userProfile.nickname === null ||
      userProfile.nickname === undefined ||
      typeof userProfile.nickname === "string",
  );

  TestValidator.predicate(
    "profile_picture_url is string or null or undefined",
    userProfile.profile_picture_url === null ||
      userProfile.profile_picture_url === undefined ||
      typeof userProfile.profile_picture_url === "string",
  );

  TestValidator.predicate(
    "biography is string or null or undefined",
    userProfile.biography === null ||
      userProfile.biography === undefined ||
      typeof userProfile.biography === "string",
  );

  // created_at and updated_at must be ISO 8601 string format
  TestValidator.predicate(
    "created_at is ISO 8601 date-time string",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])[T ][0-9]{2}:[0-9]{2}:[0-9]{2}(\.\d+)?Z?$/.test(
      userProfile.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time string",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])[T ][0-9]{2}:[0-9]{2}:[0-9]{2}(\.\d+)?Z?$/.test(
      userProfile.updated_at,
    ),
  );

  // deleted_at is optional nullable - check type and if string then ISO 8601
  TestValidator.predicate(
    "deleted_at is string or null or undefined",
    userProfile.deleted_at === null ||
      userProfile.deleted_at === undefined ||
      (typeof userProfile.deleted_at === "string" &&
        /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])[T ][0-9]{2}:[0-9]{2}:[0-9]{2}(\.\d+)?Z?$/.test(
          userProfile.deleted_at,
        )),
  );
}
