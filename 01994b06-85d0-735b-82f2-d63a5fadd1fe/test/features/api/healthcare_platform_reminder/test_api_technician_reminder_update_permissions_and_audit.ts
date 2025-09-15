import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * E2E test: Ensure that technicians can update their own non-finalized
 * reminders, but updates are rejected for finalized/compliance-locked
 * reminders, and that all attempts are subject to audit logging.
 *
 * Steps:
 *
 * 1. Register a new technician account (join, via POST /auth/technician/join).
 * 2. Login with the created technician email (POST /auth/technician/login).
 * 3. Create a new reminder as that technician (POST
 *    /healthcarePlatform/technician/reminders), retrieve reminderId.
 * 4. Update the reminder with new type/message/schedule (PUT
 *    /healthcarePlatform/technician/reminders/{reminderId}), assert
 *    response reflects changes.
 * 5. Set the status of the reminder to a finalized state (simulate: update the
 *    reminder to status: 'acknowledged' or 'cancelled' via another update
 *    call).
 * 6. Attempt to update the same reminder again with new data, expect an error
 *    (business logic should reject update, likely via
 *    TestValidator.error).
 * 7. Optionally assert all attempts (success and failure) could be
 *    audited/tracked (log or note their results as part of test flow).
 */
export async function test_api_technician_reminder_update_permissions_and_audit(
  connection: api.IConnection,
) {
  // 1. Register technician account
  const password = "password1234";
  const technicianJoin = await api.functional.auth.technician.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(8),
      specialty: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(technicianJoin);
  // 2. Login as technician
  const technicianLogin = await api.functional.auth.technician.login(
    connection,
    {
      body: {
        email: technicianJoin.email,
        password,
      } satisfies IHealthcarePlatformTechnician.ILogin,
    },
  );
  typia.assert(technicianLogin);
  // 3. Create a reminder as technician
  const reminderCreate =
    await api.functional.healthcarePlatform.technician.reminders.create(
      connection,
      {
        body: {
          reminder_type: "appointment",
          reminder_message: RandomGenerator.paragraph(),
          scheduled_for: new Date(Date.now() + 86400000).toISOString(),
          status: "pending",
          organization_id: null,
          target_user_id: null,
        } satisfies IHealthcarePlatformReminder.ICreate,
      },
    );
  typia.assert(reminderCreate);
  // 4. Update the reminder and verify change
  const updateBody = {
    reminder_type: "medication",
    reminder_message: "Updated message",
    scheduled_for: new Date(Date.now() + 172800000).toISOString(),
  } satisfies IHealthcarePlatformReminder.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.technician.reminders.update(
      connection,
      {
        reminderId: reminderCreate.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "reminder type updated",
    updated.reminder_type,
    "medication",
  );
  TestValidator.equals(
    "reminder message updated",
    updated.reminder_message,
    "Updated message",
  );
  // 5. Finalize the reminder (simulate by setting status to 'acknowledged')
  const finalized =
    await api.functional.healthcarePlatform.technician.reminders.update(
      connection,
      {
        reminderId: reminderCreate.id,
        body: {
          status: "acknowledged",
        } satisfies IHealthcarePlatformReminder.IUpdate,
      },
    );
  typia.assert(finalized);
  TestValidator.equals(
    "reminder status finalized",
    finalized.status,
    "acknowledged",
  );
  // 6. Attempt to update after finalization, expect error
  await TestValidator.error("cannot update finalized reminder", async () => {
    await api.functional.healthcarePlatform.technician.reminders.update(
      connection,
      {
        reminderId: reminderCreate.id,
        body: {
          reminder_message: "Trying to update after finalized",
        } satisfies IHealthcarePlatformReminder.IUpdate,
      },
    );
  });
  // 7. Optionally, audit/logging checks would occur here (manual or via log inspection if endpoint exists).
}
