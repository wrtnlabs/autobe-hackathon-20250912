import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentReminder";

/**
 * Validates querying appointment reminders by a medical doctor using the PATCH
 * reminder index endpoint.
 *
 * This test performs the following business scenario:
 *
 * 1. Register and login as a medical doctor.
 * 2. The medical doctor creates an appointment.
 * 3. The doctor creates several reminders for that appointment using different
 *    delivery channels.
 * 4. The doctor uses the PATCH (index) endpoint to search for reminders on that
 *    appointment, filtered by recipient, delivery_channel, and status.
 * 5. The test checks that reminders are filtered appropriately and all returned
 *    reminders match the search criteria provided.
 * 6. The test exercises filtering with non-existent criteria, expecting empty
 *    results.
 */
export async function test_api_medical_doctor_appointment_reminders_update_with_dependencies(
  connection: api.IConnection,
) {
  // 1. Register doctor and login
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorNPI = RandomGenerator.alphaNumeric(10);
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: doctorNPI,
      password: RandomGenerator.alphaNumeric(12),
      specialty: "cardiology",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(doctor);
  const doctor_id = doctor.id;

  // 2. Create appointment
  const appointment =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          healthcare_platform_department_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          provider_id: doctor_id,
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: "telemedicine",
          start_time: new Date(Date.now() + 60000).toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          recurrence_rule: null,
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointment);
  const appointmentId = appointment.id;

  // 3. Create reminders
  const deliveryChannels = ["email", "sms", "in_app"] as const;
  const reminders: IHealthcarePlatformAppointmentReminder[] = [];
  for (const channel of deliveryChannels) {
    const reminder =
      await api.functional.healthcarePlatform.medicalDoctor.appointments.reminders.create(
        connection,
        {
          appointmentId,
          body: {
            reminder_time: new Date(Date.now() + 120000).toISOString(),
            recipient_type: "provider",
            recipient_id: doctor_id,
            delivery_channel: channel,
          } satisfies IHealthcarePlatformAppointmentReminder.ICreate,
        },
      );
    typia.assert(reminder);
    reminders.push(reminder);
  }

  // 4. Use PATCH (index) to filter by delivery_channel
  for (const channel of deliveryChannels) {
    const patchResp =
      await api.functional.healthcarePlatform.medicalDoctor.appointments.reminders.index(
        connection,
        {
          appointmentId,
          body: {
            appointment_id: appointmentId,
            recipient_type: "provider",
            recipient_id: doctor_id,
            delivery_channel: channel,
            page: 1,
            limit: 10,
          } satisfies IHealthcarePlatformAppointmentReminder.IRequest,
        },
      );
    typia.assert(patchResp);
    TestValidator.predicate(
      `reminders filtered by channel (${channel})`,
      patchResp.data.every((r) => r.delivery_channel === channel),
    );
    // Should include only reminders created for this channel
    TestValidator.equals(
      `number of reminders for channel (${channel})`,
      patchResp.data.length,
      1, // because only one created per channel
    );
  }

  // 5. Filter by recipient_id and expect correct reminders
  const byRecipient =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.reminders.index(
      connection,
      {
        appointmentId,
        body: {
          recipient_id: doctor_id,
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformAppointmentReminder.IRequest,
      },
    );
  typia.assert(byRecipient);
  TestValidator.equals(
    "all reminders for doctor as recipient",
    byRecipient.data.length,
    deliveryChannels.length,
  );
  TestValidator.predicate(
    "all reminder recipient_id matches doctor_id",
    byRecipient.data.every((r) => r.recipient_id === doctor_id),
  );

  // 6. Test search for non-existent delivery_status - should yield empty result
  const nonExistent =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.reminders.index(
      connection,
      {
        appointmentId,
        body: {
          delivery_status: "notavalidstatus",
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformAppointmentReminder.IRequest,
      },
    );
  typia.assert(nonExistent);
  TestValidator.equals(
    "no reminders for bogus delivery_status",
    nonExistent.data.length,
    0,
  );
}
