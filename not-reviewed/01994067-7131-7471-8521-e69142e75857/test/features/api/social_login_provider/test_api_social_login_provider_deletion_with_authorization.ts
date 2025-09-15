import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";

/**
 * Validate the scenario where a developer joins, logs in, then deletes a social
 * login provider by authorized deletion.
 *
 * This test verifies that the developer authentication and authorization flows
 * allow deleting a social login provider. Due to the absence of a creation API
 * for social login providers, deletion is tested by a generated UUID assuming
 * authorization flow.
 *
 * Test Steps:
 *
 * 1. Developer user joins with valid data
 * 2. Developer user logs in
 * 3. Attempt to delete a social login provider ID generated as a valid UUID
 *
 * This ensures deletion endpoint accepts authorized requests and uses proper
 * authentication.
 */
export async function test_api_social_login_provider_deletion_with_authorization(
  connection: api.IConnection,
) {
  // 1. Developer user registration (join)
  const developerCreateBody = {
    email: `developer_${RandomGenerator.alphaNumeric(8)}@test.com`,
    email_verified: true,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies IOauthServerDeveloper.ICreate;

  const developer: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreateBody,
    });
  typia.assert(developer);

  // 2. Developer user login
  const developerLoginBody = {
    email: developerCreateBody.email,
    password: developerCreateBody.password_hash,
  } satisfies IOauthServerDeveloper.ILogin;

  const loginResult: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLoginBody,
    });
  typia.assert(loginResult);

  // 3. Delete a social login provider with a valid UUID (no creation API present)
  const socialLoginProviderId = typia.random<string & tags.Format<"uuid">>();

  await api.functional.oauthServer.developer.socialLoginProviders.eraseSocialLoginProvider(
    connection,
    { id: socialLoginProviderId },
  );
}
