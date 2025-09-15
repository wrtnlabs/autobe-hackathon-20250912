import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerSocialProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerSocialProvider";

/**
 * Tests the update operation for social login providers by authenticated
 * developer.
 *
 * Business Context: Developers manage OAuth social login providers such as
 * Naver, Google, Apple. Proper authorization is critical so only developers
 * can modify these configurations.
 *
 * Test Steps:
 *
 * 1. Register developer user and authenticate to obtain JWT.
 * 2. Create realistic update payload modifying client_id, client_secret,
 *    auth_url, token_url, user_info_url, scopes, and activation status.
 * 3. Call socialLoginProviders.updateSocialLoginProvider with valid ID and
 *    payload.
 * 4. Assert the returned record matches the update.
 * 5. Test unauthorized update rejection by calling without developer token.
 * 6. Test update rejection with invalid ID.
 * 7. Test update rejection with invalid URLs (malformed auth_url, token_url).
 *
 * Validation: Use typia.assert for type validation after API calls. Use
 * TestValidator.equals for checking expected vs actual values with clear
 * titles. Use TestValidator.error with awaiting for expected failures.
 */
export async function test_api_social_login_provider_update_by_developer(
  connection: api.IConnection,
) {
  // 1. Developer registers and authenticates
  const developerEmail: string = typia.random<string & tags.Format<"email">>();
  const developerPassword = "StrongPassword123!";
  const createDeveloperBody = {
    email: developerEmail,
    email_verified: true,
    password_hash: developerPassword,
  } satisfies IOauthServerDeveloper.ICreate;
  const authorizedDeveloper: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: createDeveloperBody,
    });
  typia.assert(authorizedDeveloper);

  // NOTE: The socialProviderId below is a random UUID, it may not correspond to an existing provider.
  // Test system behavior with this assumption.
  const socialProviderId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Prepare update data for social login provider
  const updatedProviderData = {
    client_id: RandomGenerator.alphaNumeric(20),
    client_secret: RandomGenerator.alphaNumeric(40),
    auth_url: `https://auth.example.com/${RandomGenerator.alphaNumeric(5)}`,
    token_url: `https://token.example.com/${RandomGenerator.alphaNumeric(5)}`,
    user_info_url: `https://userinfo.example.com/${RandomGenerator.alphaNumeric(5)}`,
    scopes: "profile email openid",
    is_active: true,
  } satisfies IOauthServerSocialProvider.IUpdate;

  // 3. Call updateSocialLoginProvider with valid ID and data
  const updatedProvider: IOauthServerSocialProvider =
    await api.functional.oauthServer.developer.socialLoginProviders.updateSocialLoginProvider(
      connection,
      {
        id: socialProviderId,
        body: updatedProviderData,
      },
    );
  typia.assert(updatedProvider);

  // 4. Validate the returned data matches updated values
  TestValidator.equals(
    "Updated client_id matches",
    updatedProvider.client_id,
    updatedProviderData.client_id,
  );
  TestValidator.equals(
    "Updated client_secret matches",
    updatedProvider.client_secret,
    updatedProviderData.client_secret,
  );
  TestValidator.equals(
    "Updated auth_url matches",
    updatedProvider.auth_url,
    updatedProviderData.auth_url,
  );
  TestValidator.equals(
    "Updated token_url matches",
    updatedProvider.token_url,
    updatedProviderData.token_url,
  );
  TestValidator.equals(
    "Updated user_info_url matches",
    updatedProvider.user_info_url,
    updatedProviderData.user_info_url,
  );
  TestValidator.equals(
    "Updated scopes matches",
    updatedProvider.scopes,
    updatedProviderData.scopes,
  );
  TestValidator.equals(
    "Updated is_active matches",
    updatedProvider.is_active,
    updatedProviderData.is_active,
  );

  // 5. Test unauthorized access rejection using unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("Unauthorized update should fail", async () => {
    await api.functional.oauthServer.developer.socialLoginProviders.updateSocialLoginProvider(
      unauthenticatedConnection,
      {
        id: socialProviderId,
        body: updatedProviderData,
      },
    );
  });

  // 6. Test update failure with invalid ID
  await TestValidator.error("Update with invalid ID should fail", async () => {
    await api.functional.oauthServer.developer.socialLoginProviders.updateSocialLoginProvider(
      connection,
      {
        id: "invalid-uuid-format",
        body: updatedProviderData,
      },
    );
  });

  // 7. Test update rejection with invalid URLs
  const invalidUrlProviderData1 = {
    ...updatedProviderData,
    auth_url: "invalid-url",
  };
  await TestValidator.error(
    "Update with invalid auth_url should fail",
    async () => {
      await api.functional.oauthServer.developer.socialLoginProviders.updateSocialLoginProvider(
        connection,
        { id: socialProviderId, body: invalidUrlProviderData1 },
      );
    },
  );

  const invalidUrlProviderData2 = {
    ...updatedProviderData,
    token_url: "htp://badurl",
  };
  await TestValidator.error(
    "Update with invalid token_url should fail",
    async () => {
      await api.functional.oauthServer.developer.socialLoginProviders.updateSocialLoginProvider(
        connection,
        { id: socialProviderId, body: invalidUrlProviderData2 },
      );
    },
  );
}
