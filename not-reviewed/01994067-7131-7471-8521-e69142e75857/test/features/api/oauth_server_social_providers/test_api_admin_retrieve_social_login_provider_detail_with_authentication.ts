import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerSocialProviders } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerSocialProviders";

/**
 * This comprehensive test scenario validates retrieving detailed information of
 * a configured social login provider by its unique identifier. It covers these
 * steps:
 *
 * 1. Admin user registration to establish admin context.
 * 2. Admin login to obtain JWT tokens necessary for authorized requests.
 * 3. Creation of a social login provider configuration with client credentials,
 *    OAuth URLs, scopes, and active status.
 * 4. Retrieval of the social login provider details by querying via provider ID.
 * 5. Validation that response data matches expected values precisely.
 * 6. Error testing when requesting non-existent provider IDs.
 * 7. Authorization checks to ensure only authenticated admins can retrieve
 *    details.
 *
 * This test ensures secure and accurate management of social login providers,
 * realistic admin workflows, and proper error handling on unauthorized access
 * and missing resources.
 */
export async function test_api_admin_retrieve_social_login_provider_detail_with_authentication(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const createdAdmin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: "StrongPassword!23",
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // 2. Admin login
  const adminLoginAuthorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "StrongPassword!23",
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(adminLoginAuthorized);

  // 3. Create social login provider
  const providerCreateData = {
    provider_name: RandomGenerator.pick([
      "google",
      "naver",
      "facebook",
      "apple",
    ] as const),
    client_id: RandomGenerator.alphaNumeric(20),
    client_secret: RandomGenerator.alphaNumeric(30),
    auth_url: `https://auth.${RandomGenerator.alphabets(5)}.com/oauth/authorize`,
    token_url: `https://token.${RandomGenerator.alphabets(5)}.com/oauth/token`,
    user_info_url: `https://api.${RandomGenerator.alphabets(5)}.com/userinfo`,
    scopes: "email profile openid",
    is_active: true,
  } satisfies IOauthServerSocialProviders.ICreate;

  const createdProvider: IOauthServerSocialProviders =
    await api.functional.oauthServer.admin.socialLoginProviders.createSocialLoginProvider(
      connection,
      {
        body: providerCreateData,
      },
    );
  typia.assert(createdProvider);

  // 4. Retrieve social login provider details (authenticated)
  const retrievedProvider: IOauthServerSocialProviders =
    await api.functional.oauthServer.admin.socialLoginProviders.atSocialLoginProvider(
      connection,
      {
        id: createdProvider.id,
      },
    );
  typia.assert(retrievedProvider);

  // 5. Validate retrieved data equality
  TestValidator.equals(
    "provider id matches",
    retrievedProvider.id,
    createdProvider.id,
  );
  TestValidator.equals(
    "provider_name matches",
    retrievedProvider.provider_name,
    providerCreateData.provider_name,
  );
  TestValidator.equals(
    "client_id matches",
    retrievedProvider.client_id,
    providerCreateData.client_id,
  );
  TestValidator.equals(
    "auth_url matches",
    retrievedProvider.auth_url,
    providerCreateData.auth_url,
  );
  TestValidator.equals(
    "token_url matches",
    retrievedProvider.token_url,
    providerCreateData.token_url,
  );
  TestValidator.equals(
    "user_info_url matches",
    retrievedProvider.user_info_url,
    providerCreateData.user_info_url,
  );
  TestValidator.equals(
    "scopes match",
    retrievedProvider.scopes,
    providerCreateData.scopes,
  );
  TestValidator.equals(
    "is_active flag matches",
    retrievedProvider.is_active,
    true,
  );

  // 6. Test error case: retrieve non-existent id
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "error on retrieving non-existent social login provider",
    async () => {
      await api.functional.oauthServer.admin.socialLoginProviders.atSocialLoginProvider(
        connection,
        {
          id: nonExistentId,
        },
      );
    },
  );

  // 7. Test authorization: unauthenticated should fail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthenticated access forbidden", async () => {
    await api.functional.oauthServer.admin.socialLoginProviders.atSocialLoginProvider(
      unauthenticatedConnection,
      {
        id: createdProvider.id,
      },
    );
  });
}
