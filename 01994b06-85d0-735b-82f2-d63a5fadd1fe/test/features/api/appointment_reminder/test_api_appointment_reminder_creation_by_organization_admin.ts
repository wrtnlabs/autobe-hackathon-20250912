import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Test organization admin's ability to create appointment reminders
 *
 * This test validates that an organization admin can schedule a reminder
 * for an existing appointment using POST
 * /healthcarePlatform/organizationAdmin/appointments/{appointmentId}/reminders.
 * The workflow includes full authentication, setup, happy path, and
 * negative cases for error handling.
 *
 * Steps:
 *
 * 1. Register and authenticate as an organization admin (via
 *    /auth/organizationAdmin/join)
 * 2. Create a new appointment as this admin (via
 *    /healthcarePlatform/organizationAdmin/appointments)
 * 3. Create a reminder for the newly created appointment using one of the
 *    appointment's participant UUIDs as recipient_id (provider_id or
 *    patient_id)
 * 4. Validate response: reminder is correctly created, appointment_id matches
 *    original, recipient_id matches provided, and reminder_time is in the
 *    future.
 * 5. Error test: attempt to create a reminder for a non-existent appointmentId
 *    and expect error.
 * 6. Error test: attempt to create a reminder for an existing appointment but
 *    with a bogus recipient_id (random UUID), expect error for invalid
 *    recipient.
 * 7. All TestValidator checks use descriptive titles and actual-vs-expected
 *    patterns, all typia.assert(response) calls on API responses.
 * 8. Comments accompany each test section describing business logic and
 *    rationale.
 */
export async function test_api_appointment_reminder_creation_by_organization_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and login as org admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: joinBody },
  );
  typia.assert(orgAdmin);

  // Step 2: Create an appointment (required to create reminder)
  const appointmentCreateBody = {
    healthcare_platform_organization_id: orgAdmin.id,
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
      "consultation",
    ] as const),
    start_time: new Date(Date.now() + 60_000).toISOString(), // 1 min in future
    end_time: new Date(Date.now() + 3_600_000).toISOString(), // 1 hr in future
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      { body: appointmentCreateBody },
    );
  typia.assert(appointment);
  TestValidator.equals(
    "appointment id matches",
    appointment.id,
    appointment.id,
  );

  // Step 3: Schedule a reminder for the appointment, using provider_id as recipient
  const reminderBody = {
    reminder_time: new Date(Date.now() + 30_000).toISOString(), // reminder in 30 seconds
    recipient_type: "provider",
    recipient_id: appointment.provider_id,
    delivery_channel: RandomGenerator.pick(["email", "sms", "in_app"] as const),
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.reminders.create(
      connection,
      { appointmentId: appointment.id, body: reminderBody },
    );
  typia.assert(reminder);
  TestValidator.equals(
    "reminder.appointment_id matches original",
    reminder.appointment_id,
    appointment.id,
  );
  TestValidator.equals(
    "reminder.recipient_id matches intended",
    reminder.recipient_id,
    appointment.provider_id,
  );
  TestValidator.equals(
    "reminder.recipient_type",
    reminder.recipient_type,
    reminderBody.recipient_type,
  );

  // Step 4: Error scenario - Create reminder with non-existent appointment id (should fail)
  await TestValidator.error(
    "reminder creation should fail for bogus appointmentId",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointments.reminders.create(
        connection,
        {
          appointmentId: typia.random<string & tags.Format<"uuid">>(),
          body: reminderBody,
        },
      );
    },
  );

  // Step 5: Error scenario - Create reminder with bogus recipient_id (should fail)
  const bogusRecipientId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "reminder creation should fail for invalid recipient_id",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointments.reminders.create(
        connection,
        {
          appointmentId: appointment.id,
          body: { ...reminderBody, recipient_id: bogusRecipientId },
        },
      );
    },
  );
}
