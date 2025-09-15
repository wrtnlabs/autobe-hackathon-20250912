import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";

/**
 * Test successful update of a reminder by department head for a specific
 * appointment.
 *
 * 1. Register a department head and obtain authentication context.
 * 2. Login as the same department head.
 * 3. Use a randomly generated (mock) appointmentId and reminderId since
 *    appointment/reminder creation endpoints are not in DTO definition.
 * 4. Prepare IUpdate payload for the reminder (change reminder_time,
 *    delivery_channel, status, etc).
 * 5. Call update() function using the authenticated connection and mock IDs.
 * 6. Assert the update response reflects the new values and passes type
 *    validation.
 * 7. Optionally verify business logic such as status is not delivered or
 *    reminder is still editable.
 */
export async function test_api_departmenthead_update_reminder_success(
  connection: api.IConnection,
) {
  // 1. Register department head
  const joinReq = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
    sso_provider: undefined,
    sso_provider_key: undefined,
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const joinRes = await api.functional.auth.departmentHead.join(connection, {
    body: joinReq,
  });
  typia.assert(joinRes);

  // 2. Login as department head
  const loginReq = {
    email: joinReq.email,
    password: joinReq.password,
    sso_provider: undefined,
    sso_provider_key: undefined,
  } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest;
  const loginRes = await api.functional.auth.departmentHead.login(connection, {
    body: loginReq,
  });
  typia.assert(loginRes);

  // 3. Use random UUIDs as appointment and reminder ID (since no create endpoint)
  const appointmentId = typia.random<string & tags.Format<"uuid">>();
  const reminderId = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare update payload
  const updatePayload = {
    reminder_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    recipient_type: "patient",
    recipient_id: typia.random<string & tags.Format<"uuid">>(),
    delivery_channel: "email",
    delivery_status: "pending",
  } satisfies IHealthcarePlatformAppointmentReminder.IUpdate;

  // 5. Perform update
  const updated =
    await api.functional.healthcarePlatform.departmentHead.appointments.reminders.update(
      connection,
      {
        appointmentId,
        reminderId,
        body: updatePayload,
      },
    );
  typia.assert(updated);

  // 6. Assert key fields were updated correctly
  TestValidator.equals("reminder_id matches", updated.id, reminderId);
  TestValidator.equals(
    "appointment_id matches",
    updated.appointment_id,
    appointmentId,
  );
  TestValidator.equals(
    "reminder_time updated",
    updated.reminder_time,
    updatePayload.reminder_time,
  );
  TestValidator.equals(
    "recipient_type updated",
    updated.recipient_type,
    "patient",
  );
  TestValidator.equals(
    "delivery_channel updated",
    updated.delivery_channel,
    "email",
  );
  TestValidator.equals(
    "recipient_id updated",
    updated.recipient_id,
    updatePayload.recipient_id,
  );
  TestValidator.equals(
    "delivery_status updated",
    updated.delivery_status,
    "pending",
  );

  // (Optional) Ensure the department head is authenticated and update is allowed (verify status is not delivered)
  TestValidator.predicate(
    "reminder still editable (status not delivered)",
    updated.delivery_status !== "sent",
  );
}
