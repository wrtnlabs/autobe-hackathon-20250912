import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSession";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * End-to-end test for system administrator session creation with
 * authentication.
 *
 * This test covers the full workflow: registering a system admin user,
 * authenticating, then creating a session for the system admin with all
 * required properties.
 *
 * It verifies both successful session creation and failure cases such as
 * unauthorized session creation attempts and invalid input data.
 *
 * Steps:
 *
 * 1. Register a new system admin user.
 * 2. Authenticate the system admin user to obtain JWT tokens.
 * 3. Create a session using the authenticated context.
 * 4. Validate the session entity returned.
 * 5. Test failure cases for unauthenticated calls and invalid IDs.
 */
export async function test_api_systemadmin_session_creation_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new system administrator user
  // Prepare a realistic tenant_id
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Create system admin user join request body
  const joinBody = {
    email: `admin${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active", // Status string is required and set to "active"
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  // Join system admin
  const adminAuthorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Login the same system admin user
  const loginBody = {
    email: adminAuthorized.email,
    password_hash: joinBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const adminLoggedIn: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. Create a new system admin session authenticated context (token is set automatically)

  const sessionToken = RandomGenerator.alphaNumeric(64);

  // We use tenant_id and user_id from login response

  // Prepare current time and expiry time ISO strings
  const nowISO = new Date().toISOString();
  const expiresISO = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 24 hours later

  const sessionCreateBody = {
    enterprise_lms_tenant_id:
      adminLoggedIn.tenant_id satisfies string as string,
    user_id: adminLoggedIn.id satisfies string as string,
    session_token: sessionToken,
    ip_address: null,
    device_info: null,
    created_at: nowISO,
    updated_at: nowISO,
    expires_at: expiresISO,
  } satisfies IEnterpriseLmsSession.ICreate;

  const session: IEnterpriseLmsSession =
    await api.functional.enterpriseLms.systemAdmin.sessions.create(connection, {
      body: sessionCreateBody,
    });
  typia.assert(session);

  // Validate that returned session fields match input fields
  TestValidator.equals(
    "session tenant id equals input tenant id",
    session.enterprise_lms_tenant_id,
    sessionCreateBody.enterprise_lms_tenant_id,
  );
  TestValidator.equals(
    "session user id equals input user id",
    session.user_id,
    sessionCreateBody.user_id,
  );
  TestValidator.equals(
    "session token equals input token",
    session.session_token,
    sessionCreateBody.session_token,
  );

  // 4. Verify failure when creating session without authentication
  // Create unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "session creation fails without authentication",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.sessions.create(
        unauthConn,
        {
          body: sessionCreateBody,
        },
      );
    },
  );

  // 5. Verify failure when session creation missing required ids
  // Missing tenant id
  const invalidBody1 = {
    ...sessionCreateBody,
    enterprise_lms_tenant_id: "00000000-0000-0000-0000-000000000000",
  } satisfies IEnterpriseLmsSession.ICreate;

  // Try with missing user_id as invalid uuid (we must include user_id since required, but put an empty UUID to simulate invalid value)
  const invalidBody2 = {
    ...sessionCreateBody,
    user_id: "00000000-0000-0000-0000-000000000000",
  } satisfies IEnterpriseLmsSession.ICreate;

  await TestValidator.error(
    "session creation fails with invalid tenant id",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.sessions.create(
        connection,
        {
          body: invalidBody1,
        },
      );
    },
  );

  await TestValidator.error(
    "session creation fails with invalid user id",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.sessions.create(
        connection,
        {
          body: invalidBody2,
        },
      );
    },
  );
}
