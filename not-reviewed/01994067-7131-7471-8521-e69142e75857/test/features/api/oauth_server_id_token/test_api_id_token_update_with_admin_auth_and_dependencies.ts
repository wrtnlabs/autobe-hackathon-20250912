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
 * Validate updating an existing OAuth ID token with full admin authentication
 * and dependent flows.
 *
 * This test simulates a real-world scenario where an admin user updates an ID
 * token record in an OAuth server. It ensures proper role-based security,
 * validates OAuth entity relationships, and confirms the update operation's
 * correctness.
 *
 * The process includes multi-role actors (admin, developer, member) performing
 * their respective operations such as joining and logging in, client
 * registration, authorization code issuance, ID token issuance, and finally ID
 * token update by admin.
 *
 * Steps:
 *
 * 1. Admin user joins and logs in.
 * 2. Admin creates an OAuth client.
 * 3. Developer joins and logs in.
 * 4. Developer creates authorization code for the client.
 * 5. Member joins and logs in.
 * 6. Member creates an ID token linked to client and authorization code.
 * 7. Admin updates the ID token with new token data.
 * 8. Validations check that the update reflects correctly and all types conform.
 */
export async function test_api_id_token_update_with_admin_auth_and_dependencies(
  connection: api.IConnection,
) {
  // 1. Admin user joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: "TestPassword123!",
  } satisfies IOauthServerAdmin.ICreate;
  const adminUser: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminUser);

  // 2. Admin user logs in
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
  } satisfies IOauthServerAdmin.ILogin;
  const adminLogin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLogin);

  // 3. Create OAuth client as admin
  const oauthClientBody = {
    client_id: RandomGenerator.alphaNumeric(12),
    client_secret: RandomGenerator.alphaNumeric(24),
    redirect_uri: "https://client.example.com/callback",
    is_trusted: true,
    logo_uri: null,
  } satisfies IOauthServerOauthClient.ICreate;
  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: oauthClientBody,
    });
  typia.assert(oauthClient);

  // 4. Developer user joins
  const developerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password_hash: RandomGenerator.alphaNumeric(40),
  } satisfies IOauthServerDeveloper.ICreate;
  const developerUser: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerJoinBody,
    });
  typia.assert(developerUser);

  // 5. Developer user logs in
  const developerLoginBody = {
    email: developerJoinBody.email,
    password: "TestPassword123!",
  } satisfies IOauthServerDeveloper.ILogin;
  const developerLogin: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLoginBody,
    });
  typia.assert(developerLogin);

  // 6. Create authorization code as developer
  const authorizationCodeBody = {
    oauth_client_id: oauthClient.id,
    code: RandomGenerator.alphaNumeric(20),
    data: JSON.stringify({ scope: "openid email profile" }),
    redirect_uri: oauthClient.redirect_uri,
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  } satisfies IOauthServerAuthorizationCode.ICreate;
  const authorizationCode: IOauthServerAuthorizationCode =
    await api.functional.oauthServer.developer.authorizationCodes.create(
      connection,
      { body: authorizationCodeBody },
    );
  typia.assert(authorizationCode);

  // 7. Member user joins
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
  } satisfies IOauthServerMember.ICreate;
  const memberUser: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinBody });
  typia.assert(memberUser);

  // 8. Member user logs in
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: "TestPassword123!",
  } satisfies IOauthServerMember.ILogin;
  const memberLogin: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 9. Create ID token
  const idTokenCreateBody = {
    oauth_client_id: oauthClient.id,
    authorization_code_id: authorizationCode.id,
    token: RandomGenerator.alphaNumeric(40),
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  } satisfies IOauthServerIdToken.ICreate;
  const idToken: IOauthServerIdToken =
    await api.functional.oauthServer.member.idTokens.createIdToken(connection, {
      body: idTokenCreateBody,
    });
  typia.assert(idToken);

  // 10. Update the ID token as admin
  const idTokenUpdateBody = {
    oauth_client_id: oauthClient.id,
    authorization_code_id: authorizationCode.id,
    token: RandomGenerator.alphaNumeric(60),
    expires_at: new Date(Date.now() + 7200000).toISOString(),
  } satisfies IOauthServerIdToken.IUpdate;
  const updatedToken: IOauthServerIdToken =
    await api.functional.oauthServer.admin.idTokens.update(connection, {
      id: idToken.id,
      body: idTokenUpdateBody,
    });
  typia.assert(updatedToken);

  // 11. Validations
  TestValidator.equals(
    "token updated with new value",
    updatedToken.token,
    idTokenUpdateBody.token,
  );
  TestValidator.equals(
    "oauth_client_id remains consistent",
    updatedToken.oauth_client_id,
    idTokenUpdateBody.oauth_client_id,
  );
  TestValidator.equals(
    "authorization_code_id remains consistent",
    updatedToken.authorization_code_id,
    idTokenUpdateBody.authorization_code_id,
  );
  TestValidator.equals(
    "expires_at updated",
    updatedToken.expires_at,
    idTokenUpdateBody.expires_at,
  );
}
