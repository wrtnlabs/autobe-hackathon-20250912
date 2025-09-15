import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerAuthorizationCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAuthorizationCode";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";
import type { IOauthServerRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerRefreshToken";

/**
 * This E2E test validates the successful update of a member's OAuth refresh
 * token. It comprehensively performs member signup, login, admin and developer
 * account setup, OAuth client creation, authorization code generation, refresh
 * token creation, and the final update of the refresh token.
 *
 * The test ensures all IDs and tokens comply with UUID and token string formats
 * and verifies the update reflects the new values accurately.
 *
 * This simulates real multi-role authorization workflows with proper
 * authentication switching and validates the PUT
 * /oauthServer/member/refreshTokens/{id} API's expected functionality and
 * security.
 */
export async function test_api_member_refresh_token_update_success(
  connection: api.IConnection,
) {
  // 1. Member signup
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "pass#1234";
  const member: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IOauthServerMember.ICreate,
    });
  typia.assert(member);

  // 2. Member login
  const memberLogin: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IOauthServerMember.ILogin,
    });
  typia.assert(memberLogin);

  // 3. Admin join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "pass#1234";
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 4. Admin login
  const adminLogin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 5. Developer join
  const developerEmail: string = typia.random<string & tags.Format<"email">>();
  const developerPassword = "pass#1234";
  const developer: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: developerEmail,
        email_verified: true,
        password_hash: developerPassword,
      } satisfies IOauthServerDeveloper.ICreate,
    });
  typia.assert(developer);

  // 6. Developer login
  const developerLogin: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: {
        email: developerEmail,
        password: developerPassword,
      } satisfies IOauthServerDeveloper.ILogin,
    });
  typia.assert(developerLogin);

  // 7. Switch to admin for OAuth client creation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IOauthServerAdmin.ILogin,
  });

  // 8. Create OAuth client by admin
  const clientId = RandomGenerator.alphaNumeric(16);
  const clientSecret = RandomGenerator.alphaNumeric(32);
  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `https://redirect.example.com/${clientId}`,
        logo_uri: null,
        is_trusted: true,
      } satisfies IOauthServerOauthClient.ICreate,
    });
  typia.assert(oauthClient);

  // 9. Switch to developer for authorization code creation
  await api.functional.auth.developer.login(connection, {
    body: {
      email: developerEmail,
      password: developerPassword,
    } satisfies IOauthServerDeveloper.ILogin,
  });

  // 10. Create authorization code
  const authCodeValue = RandomGenerator.alphaNumeric(20);
  const authCodeData = JSON.stringify({
    grant_type: "authorization_code",
    client_id: clientId,
  });
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const authorizationCode: IOauthServerAuthorizationCode =
    await api.functional.oauthServer.developer.authorizationCodes.create(
      connection,
      {
        body: {
          oauth_client_id: oauthClient.id,
          code: authCodeValue,
          data: authCodeData,
          redirect_uri: oauthClient.redirect_uri,
          expires_at: expiresAt,
        } satisfies IOauthServerAuthorizationCode.ICreate,
      },
    );
  typia.assert(authorizationCode);

  // 11. Switch back to member login (simulate role switching)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IOauthServerMember.ILogin,
  });

  // 12. Create refresh token
  const refreshTokenValue = RandomGenerator.alphaNumeric(40);
  const refreshTokenScope = "read write";
  const refreshTokenExpiresAt = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString();
  const refreshToken: IOauthServerRefreshToken =
    await api.functional.oauthServer.member.refreshTokens.create(connection, {
      body: {
        oauth_client_id: oauthClient.id,
        authorization_code_id: authorizationCode.id,
        token: refreshTokenValue,
        scope: refreshTokenScope,
        expires_at: refreshTokenExpiresAt,
      } satisfies IOauthServerRefreshToken.ICreate,
    });
  typia.assert(refreshToken);

  // 13. Update refresh token
  const newTokenValue = RandomGenerator.alphaNumeric(40);
  const newScope = "read write update";
  const newExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const updatedRefreshToken: IOauthServerRefreshToken =
    await api.functional.oauthServer.member.refreshTokens.update(connection, {
      id: refreshToken.id,
      body: {
        token: newTokenValue,
        scope: newScope,
        expires_at: newExpiresAt,
      } satisfies IOauthServerRefreshToken.IUpdate,
    });
  typia.assert(updatedRefreshToken);

  // 14. Verify update
  TestValidator.equals(
    "refresh token id remains unchanged",
    updatedRefreshToken.id,
    refreshToken.id,
  );
  TestValidator.equals(
    "refresh token updated value",
    updatedRefreshToken.token,
    newTokenValue,
  );
  TestValidator.equals(
    "refresh token updated scopes",
    updatedRefreshToken.scope,
    newScope,
  );
  TestValidator.equals(
    "refresh token updated expiry",
    updatedRefreshToken.expires_at,
    newExpiresAt,
  );
}
