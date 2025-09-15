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

/**
 * Comprehensive end-to-end test for OAuth ID token creation.
 *
 * This test covers authentication of member, admin, and developer roles,
 * creation of OAuth client and authorization code, then creation and
 * verification of the ID token.
 *
 * It validates proper linkage, timestamps, and the returned token content. Role
 * switching authentication is done via actual API calls.
 */
export async function test_api_id_token_creation_with_client_and_auth_code_dependency(
  connection: api.IConnection,
) {
  // 1. Member user joins to register and authenticate
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IOauthServerMember.ICreate;

  const member: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinBody });
  typia.assert(member);

  // Logging in explicitly even though join sets token since we need role switching
  const memberLoginBody = {
    email: member.email,
    password: memberJoinBody.password,
  } satisfies IOauthServerMember.ILogin;
  await api.functional.auth.member.login(connection, { body: memberLoginBody });

  // 2. Admin user joins and logs in, for OAuth client creation
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IOauthServerAdmin.ICreate;

  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  const adminLoginBody = {
    email: admin.email,
    password: adminJoinBody.password,
  } satisfies IOauthServerAdmin.ILogin;

  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  // 3. Create OAuth client as admin
  const oauthClientCreateBody = {
    client_id: RandomGenerator.alphaNumeric(10),
    client_secret: RandomGenerator.alphaNumeric(20),
    redirect_uri: `https://${RandomGenerator.alphabets(8)}.example.com/callback`,
    logo_uri: null,
    is_trusted: true,
  } satisfies IOauthServerOauthClient.ICreate;

  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: oauthClientCreateBody,
    });
  typia.assert(oauthClient);

  // 4. Developer user joins and logs in for authorization code creation
  const developerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password_hash: RandomGenerator.alphaNumeric(40), // hashed password simulation
  } satisfies IOauthServerDeveloper.ICreate;

  const developer: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerJoinBody,
    });
  typia.assert(developer);

  const developerLoginBody = {
    email: developer.email,
    password: RandomGenerator.alphaNumeric(12), // password string for login simulation
  } satisfies IOauthServerDeveloper.ILogin;

  await api.functional.auth.developer.login(connection, {
    body: developerLoginBody,
  });

  // 5. Create authorization code as developer
  const expiresAt = new Date(Date.now() + 600_000).toISOString(); // 10 min future

  const authorizationCodeCreateBody = {
    oauth_client_id: oauthClient.id,
    code: RandomGenerator.alphaNumeric(20),
    data: JSON.stringify({ example: "oauth-request-data" }),
    redirect_uri: oauthClient.redirect_uri,
    expires_at: expiresAt,
  } satisfies IOauthServerAuthorizationCode.ICreate;

  const authorizationCode: IOauthServerAuthorizationCode =
    await api.functional.oauthServer.developer.authorizationCodes.create(
      connection,
      { body: authorizationCodeCreateBody },
    );
  typia.assert(authorizationCode);

  // 6. Switch back to member login to create ID token
  await api.functional.auth.member.login(connection, { body: memberLoginBody });

  // 7. Create ID token linked to OAuth client and authorization code
  const idTokenCreateBody = {
    oauth_client_id: oauthClient.id,
    authorization_code_id: authorizationCode.id,
    token: RandomGenerator.alphaNumeric(50),
    expires_at: new Date(Date.now() + 3600_000).toISOString(), // 1 hour validity
  } satisfies IOauthServerIdToken.ICreate;

  const idToken: IOauthServerIdToken =
    await api.functional.oauthServer.member.idTokens.createIdToken(connection, {
      body: idTokenCreateBody,
    });
  typia.assert(idToken);

  // 8. Validate linkage and fields
  TestValidator.equals(
    "ID token references correct OAuth client",
    idToken.oauth_client_id,
    oauthClient.id,
  );
  TestValidator.equals(
    "ID token references correct Authorization Code",
    idToken.authorization_code_id,
    authorizationCode.id,
  );
  TestValidator.predicate(
    "ID token has token string",
    typeof idToken.token === "string" && idToken.token.length > 0,
  );
  TestValidator.predicate(
    "ID token expiry is in the future",
    new Date(idToken.expires_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "ID token created_at is a valid ISO date",
    typeof idToken.created_at === "string" &&
      !isNaN(Date.parse(idToken.created_at)),
  );
  TestValidator.predicate(
    "ID token updated_at is a valid ISO date",
    typeof idToken.updated_at === "string" &&
      !isNaN(Date.parse(idToken.updated_at)),
  );
}
