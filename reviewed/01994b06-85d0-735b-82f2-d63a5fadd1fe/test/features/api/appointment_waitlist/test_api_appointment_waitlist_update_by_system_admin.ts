import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates that a system admin can update a waitlist entry for an appointment.
 *
 * 1. Create and authenticate as a system admin
 * 2. Create and authenticate as a receptionist
 * 3. Receptionist creates an appointment
 * 4. Register and authenticate a patient
 * 5. Patient is added to appointment's waitlist
 * 6. Authenticate as system admin
 * 7. Update the waitlist entry as system admin (change status and join_time)
 * 8. Validate the update is reflected
 * 9. Attempt update on non-existent waitlist entry and expect failure
 */
export async function test_api_appointment_waitlist_update_by_system_admin(
  connection: api.IConnection,
) {
  // 1. System admin registration and login
  const sysAdminEmail = RandomGenerator.name(1) + "@business-admin.com";
  const sysAdminPassword = RandomGenerator.alphaNumeric(10);
  const sysAdminJoin = {
    email: sysAdminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: sysAdminEmail,
    password: sysAdminPassword,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdmin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: sysAdminJoin,
    });
  typia.assert(sysAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 2. Receptionist registration and login
  const receptionistEmail = RandomGenerator.name(1) + "@business.com";
  const receptionistPassword = RandomGenerator.alphaNumeric(8);
  const receptionist: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.join(connection, {
      body: {
        email: receptionistEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    });
  typia.assert(receptionist);
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 3. Receptionist creates appointment
  // Use random UUIDs for organization, provider, status and patient association (simulate references)
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const providerId = typia.random<string & tags.Format<"uuid">>();
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const startTime = now.toISOString();
  const endTime = new Date(now.getTime() + 3600_000).toISOString();

  const appointment: IHealthcarePlatformAppointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organizationId,
          provider_id: providerId,
          patient_id: patientId,
          status_id: statusId,
          appointment_type: "in-person",
          start_time: startTime,
          end_time: endTime,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointment);

  // 4. Patient registration and login
  const patientEmail = RandomGenerator.name(1) + "@patient.com";
  const patientPassword = RandomGenerator.alphaNumeric(9);
  const patientJoin = {
    email: patientEmail,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(1985, 0, 1).toISOString(),
    phone: RandomGenerator.mobile(),
    password: patientPassword,
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patient: IHealthcarePlatformPatient.IAuthorized =
    await api.functional.auth.patient.join(connection, { body: patientJoin });
  typia.assert(patient);
  await api.functional.auth.patient.login(connection, {
    body: { email: patientEmail, password: patientPassword },
  });

  // 5. Patient is added to appointment waitlist
  const waitlistItem: IHealthcarePlatformAppointmentWaitlist =
    await api.functional.healthcarePlatform.patient.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          appointment_id: appointment.id,
          patient_id: patient.id,
          status: "active",
        } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate,
      },
    );
  typia.assert(waitlistItem);

  // 6. System admin logs back in (to enforce session switch)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 7. Update waitlist item as system admin
  const updatedStatus = "promoted";
  const updatedJoinTime = new Date(Date.now() + 1000000).toISOString();
  const updatedWaitlist: IHealthcarePlatformAppointmentWaitlist =
    await api.functional.healthcarePlatform.systemAdmin.appointments.waitlists.update(
      connection,
      {
        appointmentId: appointment.id,
        waitlistId: waitlistItem.id,
        body: {
          status: updatedStatus,
          join_time: updatedJoinTime,
        } satisfies IHealthcarePlatformAppointmentWaitlist.IUpdate,
      },
    );
  typia.assert(updatedWaitlist);
  TestValidator.equals(
    "waitlist updated status",
    updatedWaitlist.status,
    updatedStatus,
  );
  TestValidator.equals(
    "waitlist updated join_time",
    updatedWaitlist.join_time,
    updatedJoinTime,
  );

  // 8. Try updating non-existent appointment waitlist entry (should fail)
  const fakeWaitlistId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update non-existent waitlist entry fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.appointments.waitlists.update(
        connection,
        {
          appointmentId: appointment.id,
          waitlistId: fakeWaitlistId,
          body: {
            status: "removed",
          } satisfies IHealthcarePlatformAppointmentWaitlist.IUpdate,
        },
      );
    },
  );
}
