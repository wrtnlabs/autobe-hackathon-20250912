import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSession";
import type { IEnterpriseLmsSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSessions";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Test updating an existing system administrator session.
 *
 * 1. Register system administrator user.
 * 2. Authenticate system admin user and obtain JWT tokens.
 * 3. Create an initial session.
 * 4. Update the session with new valid data.
 * 5. Assert successful update and data integrity.
 * 6. Test invalid update scenarios including unauthorized and invalid session
 *    ID.
 */
export async function test_api_systemadmin_session_update_with_authentication(
  connection: api.IConnection,
) {
  // 1. System admin join
  const adminCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const authorizedAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(authorizedAdmin);

  // 2. System admin login
  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const loggedInAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Create a session
  const sessionCreateBody = {
    enterprise_lms_tenant_id: authorizedAdmin.tenant_id,
    user_id: authorizedAdmin.id,
    session_token: RandomGenerator.alphaNumeric(20),
    ip_address: null,
    device_info: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
  } satisfies IEnterpriseLmsSession.ICreate;

  const createdSession: IEnterpriseLmsSession =
    await api.functional.enterpriseLms.systemAdmin.sessions.create(connection, {
      body: sessionCreateBody,
    });
  typia.assert(createdSession);

  // 4. Update the session
  // Prepare update body
  const sessionUpdateBody = {
    enterprise_lms_tenant_id: authorizedAdmin.tenant_id,
    user_id: authorizedAdmin.id,
    session_token: RandomGenerator.alphaNumeric(25),
    ip_address: "192.168.1.1",
    device_info: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    created_at: createdSession.created_at,
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7200 * 1000).toISOString(),
  } satisfies IEnterpriseLmsSessions.IUpdate;

  const updatedSession: IEnterpriseLmsSessions =
    await api.functional.enterpriseLms.systemAdmin.sessions.update(connection, {
      id: createdSession.id,
      body: sessionUpdateBody,
    });
  typia.assert(updatedSession);

  // Assertions
  TestValidator.equals(
    "updated session id matches created session id",
    updatedSession.id,
    createdSession.id,
  );
  TestValidator.equals(
    "updated session tenant id matches authorized tenant id",
    updatedSession.enterprise_lms_tenant_id,
    authorizedAdmin.tenant_id,
  );
  TestValidator.equals(
    "updated session user id matches authorized user id",
    updatedSession.user_id,
    authorizedAdmin.id,
  );
  TestValidator.equals(
    "updated token matches update body token",
    updatedSession.session_token,
    sessionUpdateBody.session_token,
  );
  TestValidator.equals(
    "updated ip address matches update body ip",
    updatedSession.ip_address,
    sessionUpdateBody.ip_address,
  );
  TestValidator.equals(
    "updated device info matches update body device info",
    updatedSession.device_info,
    sessionUpdateBody.device_info,
  );

  // 5. Error scenario: invalid session ID
  await TestValidator.error(
    "update with invalid session ID should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.sessions.update(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
          body: sessionUpdateBody,
        },
      );
    },
  );

  // 6. Error scenario: unauthorized update attempt
  // Disconnect by creating unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "update without authorization should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.sessions.update(
        unauthenticatedConnection,
        {
          id: createdSession.id,
          body: sessionUpdateBody,
        },
      );
    },
  );
}
