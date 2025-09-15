import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * Test successful deletion (soft-delete) of a reminder by its owning medical
 * doctor.
 *
 * Steps:
 *
 * 1. Create/register medical doctor account (unique email/NPI/randomized values).
 * 2. Login as doctor (using registered email/password) to simulate authentication
 *    context.
 * 3. Create a reminder as this doctor, capturing the assigned reminderId from the
 *    response.
 * 4. Delete the reminder using the delete endpoint with its reminderId.
 * 5. Validate business rules: After deletion, ensure the reminder's deleted_at is
 *    set. Optionally, a second delete must error.
 * 6. Validate forbidden deletes: Attempting to delete again must error (already
 *    deleted).
 *
 * Note: There is no endpoint to fetch reminder by id/list after deletion to
 * confirm soft-delete marker; this is handled as a comment until such API
 * exists.
 */
export async function test_api_medical_doctor_reminder_delete_success(
  connection: api.IConnection,
) {
  // (1) Register a medical doctor account
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(2),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    specialty: RandomGenerator.paragraph({ sentences: 1 }),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: joinInput,
  });
  typia.assert(doctor);

  // (2) Login as medical doctor (refresh session)
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IHealthcarePlatformMedicalDoctor.ILogin;
  const loggedIn = await api.functional.auth.medicalDoctor.login(connection, {
    body: loginInput,
  });
  typia.assert(loggedIn);

  // (3) Create reminder as this doctor (minimal, required fields - scheduled for near future, random type, simple message)
  const createBody = {
    reminder_type: RandomGenerator.name(1),
    reminder_message: RandomGenerator.paragraph({ sentences: 2 }),
    scheduled_for: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour in future
  } satisfies IHealthcarePlatformReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.medicalDoctor.reminders.create(
      connection,
      { body: createBody },
    );
  typia.assert(reminder);
  TestValidator.equals(
    "reminder owner matches doctor after create",
    doctor.id,
    reminder.target_user_id,
  );
  TestValidator.predicate(
    "reminder not deleted after create",
    !reminder.deleted_at,
  );

  // (4) Delete the reminder by reminderId
  await api.functional.healthcarePlatform.medicalDoctor.reminders.erase(
    connection,
    { reminderId: reminder.id },
  );

  // (5) No endpoint exists to fetch deleted reminder to confirm deleted_at; this is noted for future-proving, but is not testable currently.

  // (6) Attempt to delete again should error
  await TestValidator.error(
    "deleting already deleted reminder should error",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.reminders.erase(
        connection,
        { reminderId: reminder.id },
      );
    },
  );
}
