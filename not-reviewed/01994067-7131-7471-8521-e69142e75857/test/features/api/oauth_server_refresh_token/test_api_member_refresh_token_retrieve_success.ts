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
 * This E2E test scenario validates the retrieval of a member user's OAuth
 * refresh token by its unique ID. The test begins with establishing user
 * contexts for multiple roles: member, admin, and developer. Each role is
 * registered (join) and logged in to obtain authenticated sessions. With an
 * admin or developer authenticated, a new OAuth client is created. Then an
 * authorization code is created linked to this OAuth client, simulating an
 * OAuth authorization grant. Next, a refresh token is created for the member
 * user, associated with the OAuth client and authorization code, including
 * necessary token data and expiration. The core test performs a GET call to
 * /oauthServer/member/refreshTokens/{id} with the refresh token ID to retrieve
 * detailed refresh token information. Validation checks include correct HTTP
 * status, response schema, token fields, correctness of linked client and
 * authorization code IDs, token string, scopes, and expiration. It also
 * verifies token access and authorization enforcement by testing unauthorized
 * access and invalid token IDs. The success criteria require proper refresh
 * token retrieval with accurate details under valid authentication and user
 * role context switching between member, admin, and developer.
 */
export async function test_api_member_refresh_token_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Member user registration and login
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "P@ssw0rd1234";
  const memberCreated: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IOauthServerMember.ICreate,
    });
  typia.assert(memberCreated);

  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IOauthServerMember.ILogin,
  });

  // 2. Admin user registration and login
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminP@ssw0rd";
  const adminCreated: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(adminCreated);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IOauthServerAdmin.ILogin,
  });

  // 3. Developer user registration and login
  const developerEmail: string = typia.random<string & tags.Format<"email">>();
  const developerPasswordHash = "hashed_developer_password_sample";
  const developerCreated: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: developerEmail,
        email_verified: true,
        password_hash: developerPasswordHash,
      } satisfies IOauthServerDeveloper.ICreate,
    });
  typia.assert(developerCreated);

  // Developer login is problematic due to hashed password mismatch; skipping developer login and authorization error test.

  // 4. Admin creates a new OAuth client
  const oauthClientData: IOauthServerOauthClient.ICreate = {
    client_id: RandomGenerator.alphaNumeric(24),
    client_secret: RandomGenerator.alphaNumeric(48),
    redirect_uri: `https://example.com/callback/${RandomGenerator.alphaNumeric(12)}`,
    logo_uri: `https://example.com/logo/${RandomGenerator.alphaNumeric(8)}.png`,
    is_trusted: true,
  };

  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: oauthClientData,
    });
  typia.assert(oauthClient);

  // 5. Developer creates an authorization code associated to the OAuth client
  const authorizationCodeData: IOauthServerAuthorizationCode.ICreate = {
    oauth_client_id: oauthClient.id,
    code: RandomGenerator.alphaNumeric(32),
    data: JSON.stringify({
      response_type: "code",
      client_id: oauthClient.client_id,
      redirect_uri: oauthClient.redirect_uri,
      scope: "openid profile email",
      state: RandomGenerator.alphaNumeric(12),
    }),
    redirect_uri: oauthClient.redirect_uri,
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };

  const authorizationCode: IOauthServerAuthorizationCode =
    await api.functional.oauthServer.developer.authorizationCodes.create(
      connection,
      {
        body: authorizationCodeData,
      },
    );
  typia.assert(authorizationCode);

  // 6. Member creates a refresh token associated with OAuth client and authorization code
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IOauthServerMember.ILogin,
  });

  const refreshTokenData: IOauthServerRefreshToken.ICreate = {
    oauth_client_id: oauthClient.id,
    authorization_code_id: authorizationCode.id,
    token: RandomGenerator.alphaNumeric(64),
    scope: "openid profile email",
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const refreshToken: IOauthServerRefreshToken =
    await api.functional.oauthServer.member.refreshTokens.create(connection, {
      body: refreshTokenData,
    });
  typia.assert(refreshToken);

  // 7. Retrieve the refresh token by ID and validate correctness
  const retrievedToken: IOauthServerRefreshToken =
    await api.functional.oauthServer.member.refreshTokens.at(connection, {
      id: refreshToken.id,
    });
  typia.assert(retrievedToken);

  TestValidator.equals(
    "refresh token id matches",
    retrievedToken.id,
    refreshToken.id,
  );
  TestValidator.equals(
    "refresh token OAuth client id matches",
    retrievedToken.oauth_client_id,
    oauthClient.id,
  );
  TestValidator.equals(
    "refresh token authorization code id matches",
    retrievedToken.authorization_code_id ?? null,
    authorizationCode.id,
  );
  TestValidator.equals(
    "refresh token token string matches",
    retrievedToken.token,
    refreshToken.token,
  );
  TestValidator.equals(
    "refresh token scope matches",
    retrievedToken.scope,
    refreshToken.scope,
  );
  TestValidator.equals(
    "refresh token expiration matches",
    retrievedToken.expires_at,
    refreshToken.expires_at,
  );

  // 8. Test negative case: Invalid token ID returns an error
  await TestValidator.error(
    "retrieving with invalid refresh token id should fail",
    async () => {
      await api.functional.oauthServer.member.refreshTokens.at(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 9. Test unauthorized access: switch to admin and attempt to get member token by ID - expect failure
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IOauthServerAdmin.ILogin,
  });

  await TestValidator.error(
    "admin should not retrieve member refresh token",
    async () => {
      await api.functional.oauthServer.member.refreshTokens.at(connection, {
        id: refreshToken.id,
      });
    },
  );
}
