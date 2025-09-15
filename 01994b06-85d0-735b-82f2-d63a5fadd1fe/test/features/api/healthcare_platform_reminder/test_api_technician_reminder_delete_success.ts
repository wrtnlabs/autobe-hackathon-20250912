import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Test successful technician reminder deletion (soft delete scenario).
 *
 * Steps:
 *
 * 1. Register technician (business email domain, license number)
 * 2. Login as technician (activate session context)
 * 3. Create a reminder (minimal valid required fields)
 * 4. Delete the created reminder by id (soft delete)
 * 5. Repeat deletion of the same reminder, verifying correct error Notes:
 *
 * - Reminder get/list endpoints not available, cannot verify soft-delete via
 *   query; only happy path and error-on-repeat are tested.
 * - Ownership/business/locked/finalized rules not testable due to lack of API
 *   fields/endpoints for such state; test only what can be proved given DTOs
 *   and SDK functions.
 */
export async function test_api_technician_reminder_delete_success(
  connection: api.IConnection,
) {
  // 1. Register technician (unique business email and dummy license)
  const uniqueEmail = `tech.${RandomGenerator.alphaNumeric(10)}@company.com`;
  const joinInput = {
    email: uniqueEmail,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformTechnician.IJoin;
  const joined = await api.functional.auth.technician.join(connection, {
    body: joinInput,
  });
  typia.assert(joined);

  // 2. Login (required for session)
  const loginInput = {
    email: uniqueEmail,
    password: joinInput.license_number,
  } satisfies IHealthcarePlatformTechnician.ILogin;
  const loggedIn = await api.functional.auth.technician.login(connection, {
    body: loginInput,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "logged in user id same as joined user",
    loggedIn.id,
    joined.id,
  );

  // 3. Create minimal valid reminder
  const createBody = {
    reminder_type: RandomGenerator.name(1),
    reminder_message: RandomGenerator.paragraph({ sentences: 2 }),
    scheduled_for: new Date(Date.now() + 60000).toISOString(),
  } satisfies IHealthcarePlatformReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.technician.reminders.create(
      connection,
      { body: createBody },
    );
  typia.assert(reminder);
  TestValidator.equals(
    "reminder created_at is set",
    typeof reminder.created_at,
    "string",
  );
  TestValidator.equals(
    "deleted_at is initially undefined",
    reminder.deleted_at,
    undefined,
  );

  // 4. Delete the reminder (erase/soft-delete)
  await api.functional.healthcarePlatform.technician.reminders.erase(
    connection,
    { reminderId: reminder.id },
  );

  // 5. Re-deleting should fail (test error path)
  await TestValidator.error("re-deleting reminder should fail", async () => {
    await api.functional.healthcarePlatform.technician.reminders.erase(
      connection,
      { reminderId: reminder.id },
    );
  });
}
