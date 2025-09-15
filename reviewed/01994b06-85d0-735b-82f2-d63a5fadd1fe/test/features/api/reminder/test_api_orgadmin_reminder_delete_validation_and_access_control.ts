import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * Validate organization admin reminder deletion edge and negative scenarios.
 *
 * This test ensures that access control, input validation, idempotency,
 * compliance protection, and org scoping are enforced when deleting reminders
 * as an organization admin. The workflow is:
 *
 * 1. Register and login as OrgAdmin-A; create a reminder.
 * 2. Try DELETE as unauthenticated (empty headers) — should be denied.
 * 3. Register OrgAdmin-B (different org); try DELETE with OrgAdmin-B — should be
 *    denied (wrong organization).
 * 4. DELETE successfully as OrgAdmin-A.
 * 5. Try to DELETE again (reminder already deleted) — should be idempotent or
 *    error.
 * 6. Try DELETE with a random but non-existent UUID — expect error (simulate not
 *    found, not type error).
 * 7. (Simulate compliance hold scenario:) create and delete another reminder
 *    (since compliance protection not testable; just checks deletion works for
 *    new reminders).
 */
export async function test_api_orgadmin_reminder_delete_validation_and_access_control(
  connection: api.IConnection,
) {
  // 1. OrgAdmin-A registers and logs in, creates a reminder
  const orgA_email = typia.random<string & tags.Format<"email">>();
  const orgA_full_name = RandomGenerator.name();
  const orgA_password = "Password123!";
  const orgAdminA = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgA_email,
        full_name: orgA_full_name,
        password: orgA_password,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminA);
  // login again to reestablish context (access token overwritten)
  const loginA = await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgA_email,
      password: orgA_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  typia.assert(loginA);
  // create reminder
  const reminderA =
    await api.functional.healthcarePlatform.organizationAdmin.reminders.create(
      connection,
      {
        body: {
          reminder_type: "test-delete",
          reminder_message: RandomGenerator.paragraph({ sentences: 2 }),
          scheduled_for: new Date(Date.now() + 60 * 1000).toISOString(), // 1 min in future
          organization_id: orgAdminA.id,
        } satisfies IHealthcarePlatformReminder.ICreate,
      },
    );
  typia.assert(reminderA);

  // 2. Try delete as unauthenticated (empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated users cannot delete reminders",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.reminders.erase(
        unauthConn,
        { reminderId: reminderA.id },
      );
    },
  );

  // 3. Register OrgAdmin-B (other org), attempt to delete OrgAdmin-A's reminder
  const orgB_email = typia.random<string & tags.Format<"email">>();
  const orgB_full_name = RandomGenerator.name();
  const orgB_password = "Password123!";
  const orgAdminB = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgB_email,
        full_name: orgB_full_name,
        password: orgB_password,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminB);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgB_email,
      password: orgB_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  // Try delete by OrgAdmin-B (should be forbidden)
  await TestValidator.error(
    "organization admin cannot delete reminders from other org",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.reminders.erase(
        connection,
        { reminderId: reminderA.id },
      );
    },
  );

  // 4. Restore OrgAdmin-A session, delete own reminder
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgA_email,
      password: orgA_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await api.functional.healthcarePlatform.organizationAdmin.reminders.erase(
    connection,
    { reminderId: reminderA.id },
  );

  // 5. Attempt deletion again (already deleted)
  await TestValidator.error(
    "deleting an already deleted reminder should error or show idempotency",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.reminders.erase(
        connection,
        { reminderId: reminderA.id },
      );
    },
  );

  // 6. Try with a random valid UUID that does not exist
  const randomNonexistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting with a random non-existent uuid returns not found error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.reminders.erase(
        connection,
        { reminderId: randomNonexistentUUID },
      );
    },
  );

  // 7. Compliance hold simulation: just create and delete a fresh reminder; actual compliance enforcement can't be tested
  const complianceReminder =
    await api.functional.healthcarePlatform.organizationAdmin.reminders.create(
      connection,
      {
        body: {
          reminder_type: "test-compliance",
          reminder_message: "Compliance workflow - for negative control",
          scheduled_for: new Date(Date.now() + 3600 * 1000).toISOString(),
          organization_id: orgAdminA.id,
        } satisfies IHealthcarePlatformReminder.ICreate,
      },
    );
  typia.assert(complianceReminder);
  await api.functional.healthcarePlatform.organizationAdmin.reminders.erase(
    connection,
    { reminderId: complianceReminder.id },
  );
}
