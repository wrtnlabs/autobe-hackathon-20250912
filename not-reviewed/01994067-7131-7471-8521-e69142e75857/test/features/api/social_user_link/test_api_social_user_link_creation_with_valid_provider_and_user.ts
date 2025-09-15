import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerSocialProviders } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerSocialProviders";
import type { IOauthServerSocialUserLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerSocialUserLinks";

/**
 * Validate the creation of a social user link by an authenticated member
 * user under a valid social login provider.
 *
 * This test performs the following steps:
 *
 * 1. Member user signs up (join) with unique email and password.
 * 2. Member user logs in to establish authentication context.
 * 3. Admin user signs up (join) and logs in to create a social login provider.
 * 4. Admin creates a new social login provider with valid OAuth configuration.
 * 5. The authenticated member user attempts to create a social user link under
 *    the created social login provider, supplying valid social user data.
 * 6. Validate that the returned social user link contains all expected fields
 *    including internal and external user IDs and token info.
 * 7. Attempt to create links with invalid socialLoginProviderId or invalid
 *    user_id to confirm error handling.
 * 8. Verify that duplicate or conflicting social user link creations raise
 *    errors accordingly.
 */
export async function test_api_social_user_link_creation_with_valid_provider_and_user(
  connection: api.IConnection,
) {
  // Step 1: Member user signs up
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "P@ssword1234";
  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IOauthServerMember.ICreate;
  const memberUser: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinBody });
  typia.assert(memberUser);

  // Step 2: Member user logs in
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IOauthServerMember.ILogin;
  const memberLogin: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // Step 3: Admin user signs up
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminP@ss123";
  const adminJoinBody = {
    email: adminEmail,
    email_verified: true,
    password: adminPassword,
  } satisfies IOauthServerAdmin.ICreate;
  const adminUser: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminUser);

  // Step 4: Admin user logs in
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IOauthServerAdmin.ILogin;
  const adminLogin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLogin);

  // Step 5: Admin creates a social login provider
  const socialProviderBody = {
    provider_name: RandomGenerator.pick(["naver", "google", "apple"] as const),
    client_id: RandomGenerator.alphaNumeric(18),
    client_secret: RandomGenerator.alphaNumeric(32),
    auth_url: "https://example.com/oauth/authorize",
    token_url: "https://example.com/oauth/token",
    user_info_url: "https://example.com/oauth/userinfo",
    scopes: "openid profile email",
    is_active: true,
  } satisfies IOauthServerSocialProviders.ICreate;
  const socialLoginProvider: IOauthServerSocialProviders =
    await api.functional.oauthServer.admin.socialLoginProviders.createSocialLoginProvider(
      connection,
      { body: socialProviderBody },
    );
  typia.assert(socialLoginProvider);

  // Step 6: Member creates a social user link with valid data
  const socialUserLinkCreateBody = {
    user_id: memberUser.id,
    social_provider_id: socialLoginProvider.id,
    external_user_id: RandomGenerator.alphaNumeric(20),
    access_token: RandomGenerator.alphaNumeric(40),
    refresh_token: RandomGenerator.alphaNumeric(40),
    token_expiry: new Date(Date.now() + 3600_000).toISOString(),
  } satisfies IOauthServerSocialUserLinks.ICreate;

  const socialUserLink: IOauthServerSocialUserLinks =
    await api.functional.oauthServer.member.socialLoginProviders.socialUserLinks.create(
      connection,
      {
        socialLoginProviderId: socialLoginProvider.id,
        body: socialUserLinkCreateBody,
      },
    );
  typia.assert(socialUserLink);

  TestValidator.equals(
    "social user link user_id match",
    socialUserLink.user_id,
    memberUser.id,
  );
  TestValidator.equals(
    "social user link social_provider_id match",
    socialUserLink.social_provider_id,
    socialLoginProvider.id,
  );
  TestValidator.equals(
    "social user link external_user_id match",
    socialUserLink.external_user_id,
    socialUserLinkCreateBody.external_user_id,
  );

  // Step 7: Attempt creation with invalid socialLoginProviderId (random UUID)
  await TestValidator.error(
    "invalid socialLoginProviderId should fail",
    async () => {
      await api.functional.oauthServer.member.socialLoginProviders.socialUserLinks.create(
        connection,
        {
          socialLoginProviderId: typia.random<string & tags.Format<"uuid">>(),
          body: socialUserLinkCreateBody,
        },
      );
    },
  );

  // Step 8: Attempt creation with invalid user_id (random UUID)
  const invalidUserLinkCreateBody = {
    ...socialUserLinkCreateBody,
    user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IOauthServerSocialUserLinks.ICreate;

  await TestValidator.error("invalid user_id should fail", async () => {
    await api.functional.oauthServer.member.socialLoginProviders.socialUserLinks.create(
      connection,
      {
        socialLoginProviderId: socialLoginProvider.id,
        body: invalidUserLinkCreateBody,
      },
    );
  });

  // Step 9: Attempt duplicate social user link creation
  await TestValidator.error(
    "duplicate social user link should fail",
    async () => {
      await api.functional.oauthServer.member.socialLoginProviders.socialUserLinks.create(
        connection,
        {
          socialLoginProviderId: socialLoginProvider.id,
          body: socialUserLinkCreateBody,
        },
      );
    },
  );
}
