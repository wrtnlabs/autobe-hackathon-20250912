import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerSocialProviders } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerSocialProviders";

export async function test_api_social_login_provider_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1. Admin authentication via join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      email_verified: true,
      password: "securePassword123",
    } satisfies IOauthServerAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2. Create a new social login provider with valid data
  const providerCreateBody = {
    provider_name: `provider-${RandomGenerator.alphaNumeric(6)}`,
    client_id: RandomGenerator.alphaNumeric(16),
    client_secret: RandomGenerator.alphaNumeric(32),
    auth_url: `https://auth.example.com/oauth/authorize`,
    token_url: `https://auth.example.com/oauth/token`,
    user_info_url: `https://auth.example.com/oauth/userinfo`,
    scopes: "profile email",
    is_active: true,
  } satisfies IOauthServerSocialProviders.ICreate;

  const createdProvider =
    await api.functional.oauthServer.admin.socialLoginProviders.createSocialLoginProvider(
      connection,
      {
        body: providerCreateBody,
      },
    );

  typia.assert(createdProvider);

  // Validate the created data matches the request
  TestValidator.equals(
    "provider_name matches",
    createdProvider.provider_name,
    providerCreateBody.provider_name,
  );
  TestValidator.equals(
    "client_id matches",
    createdProvider.client_id,
    providerCreateBody.client_id,
  );
  TestValidator.equals(
    "client_secret matches",
    createdProvider.client_secret,
    providerCreateBody.client_secret,
  );
  TestValidator.equals(
    "auth_url matches",
    createdProvider.auth_url,
    providerCreateBody.auth_url,
  );
  TestValidator.equals(
    "token_url matches",
    createdProvider.token_url,
    providerCreateBody.token_url,
  );
  TestValidator.equals(
    "user_info_url matches",
    createdProvider.user_info_url,
    providerCreateBody.user_info_url,
  );
  TestValidator.equals(
    "scopes matches",
    createdProvider.scopes,
    providerCreateBody.scopes,
  );
  TestValidator.equals(
    "is_active matches",
    createdProvider.is_active,
    providerCreateBody.is_active,
  );

  TestValidator.predicate(
    "created_at is valid ISO datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      createdProvider.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      createdProvider.updated_at,
    ),
  );

  // Step 3. Attempt to create a provider with duplicate client_id
  await TestValidator.error("duplicate client_id should fail", async () => {
    await api.functional.oauthServer.admin.socialLoginProviders.createSocialLoginProvider(
      connection,
      {
        body: {
          ...providerCreateBody,
          provider_name: `provider-dup-${RandomGenerator.alphaNumeric(4)}`,
        } satisfies IOauthServerSocialProviders.ICreate,
      },
    );
  });

  // Step 4. Attempt to create a provider with invalid URLs
  const invalidUrlsBody = {
    provider_name: `provider-invalid-${RandomGenerator.alphaNumeric(5)}`,
    client_id: RandomGenerator.alphaNumeric(16),
    client_secret: RandomGenerator.alphaNumeric(32),
    auth_url: `invalid_url`,
    token_url: `invalid_url`,
    user_info_url: `invalid_url`,
    scopes: "profile email",
    is_active: true,
  } satisfies IOauthServerSocialProviders.ICreate;

  await TestValidator.error("invalid URLs should fail", async () => {
    await api.functional.oauthServer.admin.socialLoginProviders.createSocialLoginProvider(
      connection,
      {
        body: invalidUrlsBody,
      },
    );
  });

  // Step 5. Attempt to create a provider missing required client_id
  const missingClientIdBody = {
    provider_name: `provider-missing-clientid-${RandomGenerator.alphaNumeric(4)}`,
    client_id: "",
    client_secret: RandomGenerator.alphaNumeric(32),
    auth_url: `https://auth.example.com/oauth/authorize`,
    token_url: `https://auth.example.com/oauth/token`,
    user_info_url: `https://auth.example.com/oauth/userinfo`,
    scopes: "profile email",
    is_active: true,
  } satisfies IOauthServerSocialProviders.ICreate;

  await TestValidator.error("missing client_id should fail", async () => {
    await api.functional.oauthServer.admin.socialLoginProviders.createSocialLoginProvider(
      connection,
      {
        body: missingClientIdBody,
      },
    );
  });
}
