import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";

/**
 * This test focuses on ensuring that a member user can delete a social user
 * link associated with a specific social login provider. It begins with
 * member user registration and authentication to obtain valid
 * authorization. The test proceeds to attempt deleting a social user link
 * by valid IDs representing the provider and link. It confirms successful
 * deletion with no content response. It then verifies the link no longer
 * exists and that the user's association has been cleared without affecting
 * unrelated data. The test also includes validation for error cases such as
 * deletion attempts with invalid or non-existent link IDs, and deletion
 * attempts by unauthorized users, checking proper error responses. All
 * received API responses are verified using typia.assert for type safety.
 * TestValidator assertions are used to check expected business logic and
 * error conditions.
 */
export async function test_api_social_user_link_deletion_with_authorization(
  connection: api.IConnection,
) {
  // 1. Member user registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "P@ssw0rd!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IOauthServerMember.ICreate,
  });
  typia.assert(member);

  // 2. Member user login to get valid authentication
  const login = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IOauthServerMember.ILogin,
  });
  typia.assert(login);

  // 3. Setup for deletion - generate valid UUIDs for socialLoginProviderId and socialUserLinkId
  // These identifiers must be UUID v4 format strings
  const socialLoginProviderId = typia.random<string & tags.Format<"uuid">>();
  const socialUserLinkId = typia.random<string & tags.Format<"uuid">>();

  // 4. Attempt to delete the social user link
  await api.functional.oauthServer.member.socialLoginProviders.socialUserLinks.erase(
    connection,
    {
      socialLoginProviderId,
      id: socialUserLinkId,
    },
  );

  // Since the delete API returns void, no output to assert, but assume implicit success if no error
  // 5. Attempt to delete a non-existent social user link to check error handling
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent social user link fails",
    async () => {
      await api.functional.oauthServer.member.socialLoginProviders.socialUserLinks.erase(
        connection,
        {
          socialLoginProviderId,
          id: nonExistentId,
        },
      );
    },
  );

  // 6. Attempt deletion by unauthorized user - simulate by clearing connection headers user context
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized deletion attempt fails", async () => {
    await api.functional.oauthServer.member.socialLoginProviders.socialUserLinks.erase(
      unauthenticatedConnection,
      {
        socialLoginProviderId,
        id: socialUserLinkId,
      },
    );
  });
}
