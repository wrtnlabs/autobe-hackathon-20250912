import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSessions";

/**
 * Tests updating an existing Organization Administrator session with proper
 * authentication.
 *
 * This test:
 *
 * 1. Registers a new Organization Admin user with tenant context.
 * 2. Authenticates the user.
 * 3. Updates a session record with new device info, IP, and token.
 * 4. Validates the update response matches the requested changes.
 *
 * Due to lack of explicit session creation API, the user ID is used as session
 * ID placeholder.
 *
 * Ensures strict adherence to DTO requirements and type safety.
 */
export async function test_api_organizationadmin_session_update_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register organization administrator user with tenant
  const tenantId: string = typia.random<string & tags.Format<"uuid">>();
  const email: string = typia.random<string & tags.Format<"email">>();

  const createBody = {
    tenant_id: tenantId,
    email: email,
    password: "password1234",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const authorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 2. Authenticate the organization admin user
  const loginBody = {
    email: email,
    password: "password1234",
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const loginAuth: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loginAuth);

  // 3. Prepare update data for the session
  const updateBody = {
    enterprise_lms_tenant_id: authorized.tenant_id,
    user_id: authorized.id,
    session_token: typia.random<string>(),
    ip_address: `192.168.${RandomGenerator.alphaNumeric(1)}.${RandomGenerator.alphaNumeric(1)}`,
    device_info: `Browser ${RandomGenerator.alphabets(5)} Version 1.0`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  } satisfies IEnterpriseLmsSessions.IUpdate;

  // 4. Call API to update session
  const updatedSession: IEnterpriseLmsSessions =
    await api.functional.enterpriseLms.organizationAdmin.sessions.update(
      connection,
      {
        id: authorized.id, // Using user ID as session ID placeholder
        body: updateBody,
      },
    );
  typia.assert(updatedSession);

  // 5. Validate updated session data fields
  TestValidator.equals(
    "tenant_id matches",
    updatedSession.enterprise_lms_tenant_id,
    updateBody.enterprise_lms_tenant_id,
  );
  TestValidator.equals(
    "user_id matches",
    updatedSession.user_id,
    updateBody.user_id,
  );
  TestValidator.equals(
    "session_token matches",
    updatedSession.session_token,
    updateBody.session_token,
  );
  TestValidator.equals(
    "ip_address matches",
    updatedSession.ip_address,
    updateBody.ip_address,
  );
  TestValidator.equals(
    "device_info matches",
    updatedSession.device_info,
    updateBody.device_info,
  );
  TestValidator.equals(
    "expires_at matches",
    updatedSession.expires_at,
    updateBody.expires_at,
  );
}
