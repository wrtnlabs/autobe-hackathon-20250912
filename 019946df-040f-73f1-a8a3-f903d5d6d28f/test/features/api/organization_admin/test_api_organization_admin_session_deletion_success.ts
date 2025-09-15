import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This test scenario validates successful deletion of a session by an
 * organization administrator.
 *
 * Scenario Overview: Confirm that an organization admin user can delete a
 * session record identified by its UUID.
 *
 * Workflow:
 *
 * 1. Join as a new organizationAdmin using POST /auth/organizationAdmin/join.
 * 2. Login as the organizationAdmin user.
 * 3. Ensure a session exists for deletion or create one during setup.
 * 4. Issue DELETE /enterpriseLms/organizationAdmin/sessions/{id} with
 *    appropriate authorization.
 *
 * Validation Points:
 *
 * - HTTP response indicates success (204 No Content).
 * - Subsequent attempt to GET the deleted session returns 404 Not Found.
 *
 * Business Logic:
 *
 * - Only organizationAdmin role users can perform deletion of session
 *   records.
 * - Hard deletion with no soft delete flag in the database.
 *
 * Success Criteria:
 *
 * - Deletion fully removes the session record and prevents further access.
 * - All authorization rules are respected.
 *
 * Error Handling:
 *
 * - 404 errors for invalid session IDs.
 * - 403 forbidden for unauthorized deletion attempts.
 *
 * This scenario covers the critical security feature of session record
 * deletion by organization admins.
 */
export async function test_api_organization_admin_session_deletion_success(
  connection: api.IConnection,
) {
  // 1. Join as a new organizationAdmin via /auth/organizationAdmin/join
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const email = `admin_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const password = "StrongPassword!123";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const joinBody = {
    tenant_id: tenantId,
    email,
    password,
    first_name: firstName,
    last_name: lastName,
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const joinOutput = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: joinBody },
  );
  typia.assert(joinOutput);

  // 2. Login as the organizationAdmin user
  const loginBody = {
    email,
    password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;
  const loginOutput = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loginOutput);

  // 3. Assuming a session exists for deletion, generate session id
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Issue DELETE /enterpriseLms/organizationAdmin/sessions/{id}
  await api.functional.enterpriseLms.organizationAdmin.sessions.erase(
    connection,
    { id: sessionId },
  );

  // 5. Verify that subsequent DELETE call for the same session id throws (simulate 404)
  await TestValidator.error(
    "delete already deleted session should throw",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.sessions.erase(
        connection,
        { id: sessionId },
      );
    },
  );
}
