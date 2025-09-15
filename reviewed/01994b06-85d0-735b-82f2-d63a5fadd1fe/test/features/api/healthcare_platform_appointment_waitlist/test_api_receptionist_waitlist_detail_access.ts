import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test receptionist waitlist detail access for appointments.
 *
 * This test covers:
 *
 * 1. Register system admin and receptionist users
 * 2. System admin and receptionist login
 * 3. Receptionist creates an appointment (owns org)
 * 4. System admin creates a waitlist entry for the appointment
 * 5. Receptionist retrieves the waitlist entry for that appointment (success)
 * 6. Receptionist attempts to retrieve:
 *
 *    - Non-existent waitlist/appointment IDs (expect failure)
 *    - Waitlist of appointment outside org (expect unauthorized/failure)
 *
 * All scenarios assert business rules for permissions and error handling.
 */
export async function test_api_receptionist_waitlist_detail_access(
  connection: api.IConnection,
) {
  // 1. Register both the System Admin and the Receptionist
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistPassword = RandomGenerator.alphaNumeric(12);

  // System Admin registration & login
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // Receptionist registration & login
  const recJoin = await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionistEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });
  typia.assert(recJoin);

  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 2. Receptionist creates an appointment, using receptionist's org
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: typia.assert(recJoin.id),
          provider_id: typia.random<string & tags.Format<"uuid">>(),
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: RandomGenerator.pick([
            "in-person",
            "telemedicine",
          ] as const),
          start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointment);

  // 3. System admin logs in again to re-activate role and creates a waitlist entry for the appointment
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  const waitlist =
    await api.functional.healthcarePlatform.systemAdmin.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          appointment_id: appointment.id,
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          status: "active",
        } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate,
      },
    );
  typia.assert(waitlist);

  // 4. Switch to receptionist and access waitlist
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // Success: receptionist can access the waitlist for their own org
  const fetched =
    await api.functional.healthcarePlatform.receptionist.appointments.waitlists.at(
      connection,
      {
        appointmentId: appointment.id,
        waitlistId: waitlist.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "waitlist details match",
    fetched,
    waitlist,
    (key) =>
      key === "created_at" || key === "updated_at" || key === "join_time",
  );

  // 5. Failure: invalid IDs
  const invalidUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail with invalid appointmentId",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.waitlists.at(
        connection,
        {
          appointmentId: invalidUuid,
          waitlistId: waitlist.id,
        },
      );
    },
  );

  await TestValidator.error("should fail with invalid waitlistId", async () => {
    await api.functional.healthcarePlatform.receptionist.appointments.waitlists.at(
      connection,
      {
        appointmentId: appointment.id,
        waitlistId: invalidUuid,
      },
    );
  });

  // 6. Failure: receptionist attempts to access waitlist entry in another org
  // Register another receptionist and appointment for another org
  const otherReceptionistEmail = typia.random<string & tags.Format<"email">>();
  const otherReceptionistPassword = RandomGenerator.alphaNumeric(12);
  const otherRec = await api.functional.auth.receptionist.join(connection, {
    body: {
      email: otherReceptionistEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });
  typia.assert(otherRec);
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: otherReceptionistEmail,
      password: otherReceptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });
  const otherAppointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: typia.assert(otherRec.id),
          provider_id: typia.random<string & tags.Format<"uuid">>(),
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: RandomGenerator.pick([
            "in-person",
            "telemedicine",
          ] as const),
          start_time: new Date(Date.now() + 86400000).toISOString(),
          end_time: new Date(Date.now() + 2 * 86400000).toISOString(),
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(otherAppointment);
  // Switch back to receptionist from step 1
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });
  await TestValidator.error(
    "should fail unauthorized access to waitlist for another org",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.waitlists.at(
        connection,
        {
          appointmentId: otherAppointment.id,
          waitlistId: waitlist.id,
        },
      );
    },
  );
}
