import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerSocialUserLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerSocialUserLink";
import type { IOauthServerSocialUserLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerSocialUserLinks";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerSocialUserLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerSocialUserLink";

/**
 * This test validates updating a social user link for a member's social login
 * provider.
 *
 * Steps:
 *
 * 1. Register member user and login.
 * 2. Register developer user and login.
 * 3. Using developer auth, find social user links for a chosen
 *    socialLoginProviderId.
 * 4. Randomly select one social user link for update.
 * 5. Switch auth to member user.
 * 6. Update the selected social user link with new OAuth token details.
 * 7. Verify response correctness and updated data.
 */
export async function test_api_social_user_link_update_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Register member user
  const memberEmail = `user${RandomGenerator.alphaNumeric(4)}@example.com`;
  const memberPassword = "password123";
  const member = await api.functional.auth.member.join(
    { ...connection, headers: {} }, // fresh connection without auth header
    {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IOauthServerMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Login member
  const memberLogin = await api.functional.auth.member.login(
    { ...connection, headers: {} },
    {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IOauthServerMember.ILogin,
    },
  );
  typia.assert(memberLogin);

  // 3. Register developer user
  const developerEmail = `dev${RandomGenerator.alphaNumeric(4)}@example.com`;
  const developerPassword = "password123";
  const developer = await api.functional.auth.developer.join(
    { ...connection, headers: {} },
    {
      body: {
        email: developerEmail,
        email_verified: true,
        password_hash: typia.random<string>(),
      } satisfies IOauthServerDeveloper.ICreate,
    },
  );
  typia.assert(developer);

  // 4. Login developer
  const developerLogin = await api.functional.auth.developer.login(
    { ...connection, headers: {} },
    {
      body: {
        email: developerEmail,
        password: developerPassword,
      } satisfies IOauthServerDeveloper.ILogin,
    },
  );
  typia.assert(developerLogin);

  // 5. Using developer auth, search social user links by provider
  const developerConn: api.IConnection = { ...connection, headers: {} };
  // login updates headers internally
  await api.functional.auth.developer.login(developerConn, {
    body: {
      email: developerEmail,
      password: developerPassword,
    } satisfies IOauthServerDeveloper.ILogin,
  });

  // We must find an existing socialLoginProviderId with social links

  const searchResp =
    await api.functional.oauthServer.developer.socialLoginProviders.socialUserLinks.indexSocialUserLinksByProvider(
      developerConn,
      {
        socialLoginProviderId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          limit: 50,
          offset: 0,
          deleted_at_null: true,
        } satisfies IOauthServerSocialUserLink.IRequest,
      },
    );
  typia.assert(searchResp);

  // Check if there is any data
  TestValidator.predicate(
    "Exists social user links for some provider",
    Array.isArray(searchResp.data) && searchResp.data.length > 0,
  );
  if (searchResp.data.length === 0) {
    throw new Error("No social user links found; cannot update");
  }

  // Pick one social user link to update
  const targetLink = RandomGenerator.pick(searchResp.data);

  // 6. Use member auth for update
  const memberConn: api.IConnection = { ...connection, headers: {} };
  // member login updates headers internally
  await api.functional.auth.member.login(memberConn, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IOauthServerMember.ILogin,
  });

  // 7. Update social user link with new data
  const newExternalUserId = `external_${RandomGenerator.alphaNumeric(6)}`;
  const newAccessToken = `token_${RandomGenerator.alphaNumeric(12)}`;
  const newRefreshToken = `refresh_${RandomGenerator.alphaNumeric(12)}`;
  const newTokenExpiry = new Date(Date.now() + 3600 * 1000).toISOString();

  const updateBody = {
    external_user_id: newExternalUserId,
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    token_expiry: newTokenExpiry,
  } satisfies IOauthServerSocialUserLinks.IUpdate;

  const updatedLink =
    await api.functional.oauthServer.member.socialLoginProviders.socialUserLinks.update(
      memberConn,
      {
        socialLoginProviderId: targetLink.social_provider_id,
        id: targetLink.id,
        body: updateBody,
      },
    );
  typia.assert(updatedLink);

  // Validate updated fields
  TestValidator.equals(
    "updated external_user_id",
    updatedLink.external_user_id,
    newExternalUserId,
  );
  TestValidator.equals(
    "updated access_token",
    updatedLink.access_token,
    newAccessToken,
  );
  TestValidator.equals(
    "updated refresh_token",
    updatedLink.refresh_token,
    newRefreshToken,
  );
  TestValidator.equals(
    "updated token_expiry",
    updatedLink.token_expiry,
    newTokenExpiry,
  );

  // Validate unchanged fields
  TestValidator.equals(
    "unchanged user_id",
    updatedLink.user_id,
    targetLink.user_id,
  );
  TestValidator.equals(
    "unchanged social_provider_id",
    updatedLink.social_provider_id,
    targetLink.social_provider_id,
  );

  // Validate timestamp updated
  TestValidator.predicate(
    "updated_at is newer",
    new Date(updatedLink.updated_at).getTime() >=
      new Date(targetLink.updated_at).getTime(),
  );
}
