import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerSocialProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerSocialProvider";
import type { IOauthServerSocialProviders } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerSocialProviders";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerSocialProviders } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerSocialProviders";

export async function test_api_social_login_provider_creation_and_update_flow(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminPassword = "AdminPass123!";
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new social login provider as admin
  // Generate realistic data for the provider
  const providerClientId = `client_${RandomGenerator.alphaNumeric(8)}`;
  const providerClientSecret = RandomGenerator.alphaNumeric(32);
  const providerAuthUrl = `https://auth.provider.example.com/oauth2/authorize`;
  const providerTokenUrl = `https://auth.provider.example.com/oauth2/token`;
  const providerUserInfoUrl = `https://auth.provider.example.com/oauth2/userinfo`;
  const providerName = "exampleProvider";
  const createBody = {
    provider_name: providerName,
    client_id: providerClientId,
    client_secret: providerClientSecret,
    auth_url: providerAuthUrl,
    token_url: providerTokenUrl,
    user_info_url: providerUserInfoUrl,
    scopes: "email profile",
    is_active: true,
  } satisfies IOauthServerSocialProviders.ICreate;

  const createdProvider: IOauthServerSocialProviders =
    await api.functional.oauthServer.admin.socialLoginProviders.createSocialLoginProvider(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdProvider);

  TestValidator.equals(
    "Created provider clientId matches",
    createdProvider.client_id,
    providerClientId,
  );
  TestValidator.equals(
    "Created provider clientSecret matches",
    createdProvider.client_secret,
    providerClientSecret,
  );
  TestValidator.predicate(
    "Created provider is active",
    createdProvider.is_active === true,
  );

  // 3. Attempt to create duplicate social login provider (expect error)
  await TestValidator.error(
    "Duplicate client_id on create should fail",
    async () => {
      await api.functional.oauthServer.admin.socialLoginProviders.createSocialLoginProvider(
        connection,
        {
          body: createBody,
        },
      );
    },
  );

  // 4. Retrieve provider details by ID as admin
  const providerDetails: IOauthServerSocialProviders =
    await api.functional.oauthServer.admin.socialLoginProviders.atSocialLoginProvider(
      connection,
      {
        id: createdProvider.id,
      },
    );
  typia.assert(providerDetails);

  TestValidator.equals(
    "Retrieved provider id matches",
    providerDetails.id,
    createdProvider.id,
  );
  TestValidator.equals(
    "Retrieved provider clientId matches",
    providerDetails.client_id,
    providerClientId,
  );

  // 5. Create and login developer user for update operations
  const developerEmail = `dev_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const developerPassword = "DevPass123!";
  const developer: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: developerEmail,
        email_verified: true,
        password_hash: developerPassword,
      } satisfies IOauthServerDeveloper.ICreate,
    });
  typia.assert(developer);

  const developerLogin: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: {
        email: developerEmail,
        password: developerPassword,
      } satisfies IOauthServerDeveloper.ILogin,
    });
  typia.assert(developerLogin);

  // 6. Update social login provider as developer
  const updatedClientSecret = RandomGenerator.alphaNumeric(40);
  const updatedAuthUrl = `https://auth.provider.example.com/oauth2/authorize/v2`;
  const updatedTokenUrl = `https://auth.provider.example.com/oauth2/token/v2`;
  const updatedScopes = "email profile openid";
  const updateBody = {
    client_secret: updatedClientSecret,
    auth_url: updatedAuthUrl,
    token_url: updatedTokenUrl,
    scopes: updatedScopes,
    is_active: false,
  } satisfies IOauthServerSocialProvider.IUpdate;

  const updatedProvider: IOauthServerSocialProvider =
    await api.functional.oauthServer.developer.socialLoginProviders.updateSocialLoginProvider(
      connection,
      {
        id: createdProvider.id,
        body: updateBody,
      },
    );
  typia.assert(updatedProvider);

  TestValidator.equals(
    "Updated clientSecret matches",
    updatedProvider.client_secret,
    updatedClientSecret,
  );
  TestValidator.equals(
    "Updated auth_url matches",
    updatedProvider.auth_url,
    updatedAuthUrl,
  );
  TestValidator.equals(
    "Updated token_url matches",
    updatedProvider.token_url,
    updatedTokenUrl,
  );
  TestValidator.equals(
    "Updated scopes match",
    updatedProvider.scopes,
    updatedScopes,
  );
  TestValidator.predicate(
    "Updated is_active is false",
    updatedProvider.is_active === false,
  );

  // 7. Attempt to update provider with unauthorized context (simulate failure)
  // Switch back to admin login (no developer role)
  const adminLogin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(adminLogin);

  await TestValidator.error(
    "Unauthorized update by admin user should fail",
    async () => {
      await api.functional.oauthServer.developer.socialLoginProviders.updateSocialLoginProvider(
        connection,
        {
          id: createdProvider.id,
          body: {
            client_secret: RandomGenerator.alphaNumeric(20),
          } satisfies IOauthServerSocialProvider.IUpdate,
        },
      );
    },
  );
}
