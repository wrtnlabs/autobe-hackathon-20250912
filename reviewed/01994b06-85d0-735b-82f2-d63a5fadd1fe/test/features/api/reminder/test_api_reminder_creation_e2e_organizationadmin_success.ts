import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * End-to-end test for successful organization admin reminder creation.
 *
 * Scenario steps:
 *
 * 1. Register a new organization admin via join endpoint
 * 2. Authenticate as the registered admin (login)
 * 3. Register a nurse (target user)
 * 4. As admin, create a reminder addressed to the nurse
 * 5. Validate reminder response fields correspond to inputs and business rules
 */
export async function test_api_reminder_creation_e2e_organizationadmin_success(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminJoin = {
    email: orgAdminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: orgAdminJoin,
    },
  );
  typia.assert(adminAuth);

  // 2. Authenticate admin
  const adminLoginReq = {
    email: orgAdminEmail,
    password: orgAdminJoin.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const adminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: adminLoginReq,
    },
  );
  typia.assert(adminLogin);

  // 3. Register a nurse as target
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nurseJoin = {
    email: nurseEmail,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(10),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurse = await api.functional.auth.nurse.join(connection, {
    body: nurseJoin,
  });
  typia.assert(nurse);

  // 4. As admin, create reminder for nurse
  const reminderSchedule = new Date(
    Date.now() + 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const reminderCreate = {
    reminder_type: "appointment",
    reminder_message: RandomGenerator.paragraph({ sentences: 2 }),
    scheduled_for: reminderSchedule,
    organization_id: adminAuth.id,
    target_user_id: nurse.id,
    status: "pending",
  } satisfies IHealthcarePlatformReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.organizationAdmin.reminders.create(
      connection,
      {
        body: reminderCreate,
      },
    );
  typia.assert(reminder);
  TestValidator.equals(
    "reminder type matches",
    reminder.reminder_type,
    reminderCreate.reminder_type,
  );
  TestValidator.equals(
    "reminder message matches",
    reminder.reminder_message,
    reminderCreate.reminder_message,
  );
  TestValidator.equals(
    "reminder schedule matches",
    reminder.scheduled_for,
    reminderCreate.scheduled_for,
  );
  TestValidator.equals(
    "reminder status matches",
    reminder.status,
    reminderCreate.status,
  );
  TestValidator.equals(
    "reminder organization matches",
    reminder.organization_id,
    reminderCreate.organization_id,
  );
  TestValidator.equals(
    "reminder user matches",
    reminder.target_user_id,
    reminderCreate.target_user_id,
  );
  TestValidator.predicate(
    "reminder id is valid",
    typeof reminder.id === "string" && reminder.id.length > 0,
  );
  TestValidator.predicate(
    "reminder created timestamp present",
    typeof reminder.created_at === "string" && reminder.created_at.length > 0,
  );
  TestValidator.predicate(
    "reminder updated timestamp present",
    typeof reminder.updated_at === "string" && reminder.updated_at.length > 0,
  );
}
