import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Validates technician detail retrieval of reminders and ensures access
 * restriction to other technicians' reminders.
 *
 * Scenario Steps:
 *
 * 1. System admin registers and logs in to create reminders.
 * 2. Technician A is registered and logged in.
 * 3. System admin creates a reminder for Technician A.
 * 4. Technician A fetches their own reminder, expect detailed info.
 * 5. Technician A tries to fetch Technician B's reminder, expect forbidden or not
 *    found.
 * 6. Technician A tries to fetch a non-existent reminderId, expect not found
 *    error.
 */
export async function test_api_technician_reminder_detail_valid_and_permission_denied(
  connection: api.IConnection,
) {
  // 1. System admin registration (organization setup)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(systemAdmin);

  // 2. Technician A registration and login
  const techAEmail = typia.random<string & tags.Format<"email">>();
  const techAPassword = RandomGenerator.alphaNumeric(12);
  const technicianA = await api.functional.auth.technician.join(connection, {
    body: {
      email: techAEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(8),
      specialty: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(technicianA);
  await api.functional.auth.technician.login(connection, {
    body: {
      email: techAEmail,
      password: techAPassword,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });

  // 3. Technician B registration and login
  const techBEmail = typia.random<string & tags.Format<"email">>();
  const techBPassword = RandomGenerator.alphaNumeric(12);
  const technicianB = await api.functional.auth.technician.join(connection, {
    body: {
      email: techBEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(8),
      specialty: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(technicianB);
  await api.functional.auth.technician.login(connection, {
    body: {
      email: techBEmail,
      password: techBPassword,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });

  // 4. Back to system admin to create reminders for A and B
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // Reminder for Technician A
  const reminderA =
    await api.functional.healthcarePlatform.systemAdmin.reminders.create(
      connection,
      {
        body: {
          reminder_type: "appointment",
          reminder_message: RandomGenerator.paragraph(),
          scheduled_for: new Date(Date.now() + 3600 * 1000).toISOString(),
          target_user_id: technicianA.id,
          status: "pending",
        } satisfies IHealthcarePlatformReminder.ICreate,
      },
    );
  typia.assert(reminderA);

  // Reminder for Technician B
  const reminderB =
    await api.functional.healthcarePlatform.systemAdmin.reminders.create(
      connection,
      {
        body: {
          reminder_type: "compliance",
          reminder_message: RandomGenerator.paragraph(),
          scheduled_for: new Date(Date.now() + 7200 * 1000).toISOString(),
          target_user_id: technicianB.id,
          status: "pending",
        } satisfies IHealthcarePlatformReminder.ICreate,
      },
    );
  typia.assert(reminderB);

  // 5. Technician A logs in
  await api.functional.auth.technician.login(connection, {
    body: {
      email: techAEmail,
      password: techAPassword,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });

  // 6. Technician A fetches their own reminder: expect success
  const fetchedReminderA =
    await api.functional.healthcarePlatform.technician.reminders.at(
      connection,
      {
        reminderId: reminderA.id,
      },
    );
  typia.assert(fetchedReminderA);
  TestValidator.equals(
    "reminder id matches",
    fetchedReminderA.id,
    reminderA.id,
  );
  TestValidator.equals(
    "reminder type matches",
    fetchedReminderA.reminder_type,
    reminderA.reminder_type,
  );
  TestValidator.equals(
    "reminder message matches",
    fetchedReminderA.reminder_message,
    reminderA.reminder_message,
  );
  TestValidator.equals(
    "reminder status matches",
    fetchedReminderA.status,
    "pending",
  );
  TestValidator.equals(
    "reminder is for correct technician",
    fetchedReminderA.target_user_id,
    technicianA.id,
  );

  // 7. Technician A fetches technician B's reminder: expect forbidden/not found
  await TestValidator.error(
    "access denied for other technician's reminder",
    async () => {
      await api.functional.healthcarePlatform.technician.reminders.at(
        connection,
        {
          reminderId: reminderB.id,
        },
      );
    },
  );

  // 8. Technician A fetches non-existent reminder: not found error
  const invalidReminderId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching nonexistent reminder should fail",
    async () => {
      await api.functional.healthcarePlatform.technician.reminders.at(
        connection,
        {
          reminderId: invalidReminderId,
        },
      );
    },
  );
}
