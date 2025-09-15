import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTelemedicineSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSession";

/**
 * Test that an organization admin can successfully delete a telemedicine
 * session and error is properly thrown when attempting to delete a non-existent
 * session.
 *
 * Workflow:
 *
 * 1. Register and login system admin (organization can only be created by
 *    sysadmin)
 * 2. Create an organization
 * 3. Register and login organization admin as context switch (telemedicine
 *    sessions created by org admin)
 * 4. Create a telemedicine session (using randomly generated appointment_id)
 * 5. Delete the telemedicine session as organization admin
 * 6. Confirm deletion by retrying the delete (should error)
 * 7. Confirm deletion by trying to delete a random non-existent sessionId
 */
export async function test_api_telemedicine_session_deletion_by_org_admin_success(
  connection: api.IConnection,
) {
  // 1. Register and login system admin (for org creation)
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdminJoin = {
    email: sysAdminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: sysAdminEmail,
    password: sysAdminPassword,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoin,
  });
  typia.assert(sysAdminAuth);
  // Ensure sysAdmin logged-in context
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 2. Create an organization
  const orgCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgCreate },
    );
  typia.assert(organization);

  // 3. Register and login organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdminJoin = {
    email: orgAdminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: orgAdminPassword,
    provider: "local",
    provider_key: orgAdminEmail,
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminJoin },
  );
  typia.assert(orgAdminAuth);

  // Login orgAdmin context
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. Create telemedicine session as org admin
  const appointmentId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const sessionStart = new Date(now.getTime() + 3600 * 1000).toISOString(); // 1 hour in future
  const sessionEnd = new Date(now.getTime() + 2 * 3600 * 1000).toISOString(); // 2 hours in future
  const telemedicineSessionBody = {
    appointment_id: appointmentId,
    join_link: `https://telemedicine.example.com/${RandomGenerator.alphaNumeric(10)}`,
    session_start: sessionStart,
    session_end: sessionEnd,
    session_recorded: false,
  } satisfies IHealthcarePlatformTelemedicineSession.ICreate;
  const telemedicineSession =
    await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.create(
      connection,
      { body: telemedicineSessionBody },
    );
  typia.assert(telemedicineSession);

  // 5. Delete the just-created telemedicine session
  await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.erase(
    connection,
    { telemedicineSessionId: telemedicineSession.id },
  );
  // If no error, delete considered a success

  // 6. Try deleting same session again - should error
  await TestValidator.error(
    "Deleting already deleted telemedicine session should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.erase(
        connection,
        { telemedicineSessionId: telemedicineSession.id },
      );
    },
  );

  // 7. Try deleting non-existent random sessionId, should also error
  await TestValidator.error(
    "Deleting non-existent telemedicine session should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.erase(
        connection,
        { telemedicineSessionId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
