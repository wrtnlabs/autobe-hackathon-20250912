import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * Successful soft-deletion of a nurse reminder.
 *
 * 1. Register as a nurse (satisfying all business, credential, and unique email
 *    rules)
 * 2. Log in as nurse to obtain tokens/auth session
 * 3. Create a new reminder using the nurse account
 * 4. Delete the reminder by id
 * 5. Confirm delete operation succeeds (no errors)
 * 6. Attempt deletion again — must fail
 * 7. (Skipped: Deleting compliance-locked reminder — field/RBAC not controllable
 *    here)
 */
export async function test_api_nurse_reminder_delete_success(
  connection: api.IConnection,
) {
  // 1. Register nurse
  const nurseEmail = `nurse_${RandomGenerator.alphaNumeric(8)}@clinic-demo.com`;
  const nurseLicense = RandomGenerator.alphaNumeric(10);
  const nurseJoin = {
    email: nurseEmail,
    full_name: RandomGenerator.name(),
    license_number: nurseLicense,
    specialty: RandomGenerator.pick(["ICU", "Surgery", "Oncology", null]),
    phone: RandomGenerator.mobile(),
    password: "NursePassword!123",
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurse: IHealthcarePlatformNurse.IAuthorized =
    await api.functional.auth.nurse.join(connection, { body: nurseJoin });
  typia.assert(nurse);

  // 2. Login as nurse
  const login: IHealthcarePlatformNurse.IAuthorized =
    await api.functional.auth.nurse.login(connection, {
      body: {
        email: nurseJoin.email,
        password: nurseJoin.password!,
      } satisfies IHealthcarePlatformNurse.ILogin,
    });
  typia.assert(login);

  // 3. Create reminder
  const reminderInput = {
    reminder_type: RandomGenerator.pick([
      "appointment",
      "check-in",
      "medication",
      "compliance",
    ]),
    reminder_message: RandomGenerator.paragraph({ sentences: 3 }),
    scheduled_for: new Date(Date.now() + 60000).toISOString(), // +1min
    target_user_id: nurse.id,
    status: "pending",
  } satisfies IHealthcarePlatformReminder.ICreate;
  const reminder: IHealthcarePlatformReminder =
    await api.functional.healthcarePlatform.nurse.reminders.create(connection, {
      body: reminderInput,
    });
  typia.assert(reminder);
  TestValidator.equals(
    "reminder created and id defined",
    typeof reminder.id,
    "string",
  );
  TestValidator.equals(
    "nurse is reminder's target",
    reminder.target_user_id,
    nurse.id,
  );

  // 4. Delete reminder by id
  await api.functional.healthcarePlatform.nurse.reminders.erase(connection, {
    reminderId: reminder.id!,
  });
  // Success (void return)

  // 5. Attempt double delete -- must fail
  await TestValidator.error(
    "Deleting already deleted reminder must fail",
    async () => {
      await api.functional.healthcarePlatform.nurse.reminders.erase(
        connection,
        {
          reminderId: reminder.id!,
        },
      );
    },
  );
}
