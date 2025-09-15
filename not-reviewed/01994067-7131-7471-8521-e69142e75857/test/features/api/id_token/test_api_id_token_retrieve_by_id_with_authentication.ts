import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerAuthorizationCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAuthorizationCode";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerIdToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerIdToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

export async function test_api_id_token_retrieve_by_id_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register and authenticate member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "Password123!",
    } satisfies IOauthServerMember.ICreate,
  });
  typia.assert(member);

  // 2. Register and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      email_verified: true,
      password: "AdminPass123!",
    } satisfies IOauthServerAdmin.ICreate,
  });
  typia.assert(admin);

  // 3. Register and authenticate developer user
  const developerEmail = typia.random<string & tags.Format<"email">>();
  const developer = await api.functional.auth.developer.join(connection, {
    body: {
      email: developerEmail,
      email_verified: true,
      password_hash: "hashedpassword",
    } satisfies IOauthServerDeveloper.ICreate,
  });
  typia.assert(developer);

  // 4. As admin, create OAuth client
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
    } satisfies IOauthServerAdmin.ILogin,
  });

  const oauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: {
        client_id: RandomGenerator.alphaNumeric(10),
        client_secret: RandomGenerator.alphaNumeric(20),
        redirect_uri: "https://example.com/callback",
        logo_uri: null,
        is_trusted: true,
      } satisfies IOauthServerOauthClient.ICreate,
    });
  typia.assert(oauthClient);

  // 5. As developer, create authorization code
  await api.functional.auth.developer.login(connection, {
    body: {
      email: developerEmail,
      password: "Password123!",
    } satisfies IOauthServerDeveloper.ILogin,
  });

  const authCodeBody = {
    oauth_client_id: oauthClient.id,
    code: RandomGenerator.alphaNumeric(30),
    data: JSON.stringify({ scope: "openid profile email" }),
    redirect_uri: oauthClient.redirect_uri,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  } satisfies IOauthServerAuthorizationCode.ICreate;

  const authorizationCode =
    await api.functional.oauthServer.developer.authorizationCodes.create(
      connection,
      {
        body: authCodeBody,
      },
    );
  typia.assert(authorizationCode);

  // 6. As member, create ID token
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "Password123!",
    } satisfies IOauthServerMember.ILogin,
  });

  const idTokenBody = {
    oauth_client_id: oauthClient.id,
    authorization_code_id: authorizationCode.id,
    token: RandomGenerator.alphaNumeric(40),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  } satisfies IOauthServerIdToken.ICreate;

  const idToken =
    await api.functional.oauthServer.member.idTokens.createIdToken(connection, {
      body: idTokenBody,
    });
  typia.assert(idToken);

  // 7. Retrieve the created ID token by ID
  const retrievedToken =
    await api.functional.oauthServer.member.idTokens.atIdToken(connection, {
      id: idToken.id,
    });
  typia.assert(retrievedToken);

  TestValidator.equals("ID token id matches", retrievedToken.id, idToken.id);
  TestValidator.equals(
    "authorization_code_id matches",
    retrievedToken.authorization_code_id,
    idToken.authorization_code_id,
  );
  TestValidator.equals(
    "oauth_client_id matches",
    retrievedToken.oauth_client_id,
    idToken.oauth_client_id,
  );
  TestValidator.equals(
    "token string matches",
    retrievedToken.token,
    idToken.token,
  );

  // 8b. Error test: Unauthenticated access (using empty headers)
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access should throw", async () => {
    await api.functional.oauthServer.member.idTokens.atIdToken(
      unauthenticatedConn,
      {
        id: idToken.id,
      },
    );
  });
}
