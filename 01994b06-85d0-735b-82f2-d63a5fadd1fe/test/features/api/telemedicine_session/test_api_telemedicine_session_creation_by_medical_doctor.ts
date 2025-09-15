import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformTelemedicineSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSession";

export async function test_api_telemedicine_session_creation_by_medical_doctor(
  connection: api.IConnection,
) {
  /**
   * Validates end-to-end creation of a telemedicine session by a medical
   * doctor.
   *
   * 1. Register a medical doctor and login (ensuring proper role context)
   * 2. Register an organization admin and login (switch context)
   * 3. Organization admin creates an appointment, explicitly linking to the
   *    medical doctor
   * 4. Switch back to doctor context, medical doctor creates telemedicine session
   *    for the appointment
   * 5. Validate session creation, linkage, and business-required fields
   * 6. Negative scenario: duplicate session creation should fail
   * 7. Negative scenario: a different doctor trying to create session should fail
   * 8. Negative scenario: org admin trying to create telemedicine session as a
   *    doctor should fail
   * 9. Negative scenario: attempt to create a session for invalid appointment_id
   *    should fail No type error, field-missing, or compile-failure scenarios
   *    are included. All API calls are direct and use exact DTOs.
   */
  // 1. Register and login a medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorNpi = RandomGenerator.alphaNumeric(10);
  const doctorPassword = "Password1!@#";
  const doctorJoin = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: doctorNpi,
      password: doctorPassword,
      specialty: "family medicine",
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(doctorJoin);

  // Doctor login (token refresh/context setup)
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    },
  });

  // 2. Register and login an organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = "Password1!@#";
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
        phone: RandomGenerator.mobile(),
      },
    },
  );
  typia.assert(orgAdminJoin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    },
  });

  // 3. Org admin creates a valid appointment for medical doctor
  const appointmentBody = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    provider_id: doctorJoin.id,
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: "telemedicine",
    start_time: new Date(Date.now() + 300_000).toISOString(),
    end_time: new Date(Date.now() + 3_600_000).toISOString(),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: appointmentBody,
      },
    );
  typia.assert(appointment);

  // 4. Switch back to medical doctor, login
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    },
  });

  // 5. Medical doctor creates telemedicine session
  const teleSessionBody = {
    appointment_id: appointment.id,
    join_link: `https://telemed.example.com/session/${typia.random<string & tags.Format<"uuid">>()}`,
    session_start: appointment.start_time,
    session_end: appointment.end_time,
    session_recorded: false,
  } satisfies IHealthcarePlatformTelemedicineSession.ICreate;
  const session =
    await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.create(
      connection,
      {
        body: teleSessionBody,
      },
    );
  typia.assert(session);
  TestValidator.equals(
    "session appointment id matches",
    session.appointment_id,
    appointment.id,
  );
  TestValidator.equals(
    "session join_link matches",
    session.join_link,
    teleSessionBody.join_link,
  );
  TestValidator.equals(
    "session start matches",
    session.session_start,
    appointment.start_time,
  );
  TestValidator.equals(
    "session end matches",
    session.session_end,
    appointment.end_time,
  );

  // 6. Negative: duplicate session creation not allowed
  await TestValidator.error(
    "duplicate session for same appointment rejected",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.create(
        connection,
        {
          body: teleSessionBody,
        },
      );
    },
  );

  // 7. Negative: another medical doctor (not assigned) cannot create session for this appointment
  const doctor2Email = typia.random<string & tags.Format<"email">>();
  const doctor2Npi = RandomGenerator.alphaNumeric(10);
  const doctor2Password = "Password2!@#";
  await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctor2Email,
      full_name: RandomGenerator.name(),
      npi_number: doctor2Npi,
      password: doctor2Password,
    },
  });
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctor2Email,
      password: doctor2Password,
    },
  });
  await TestValidator.error(
    "unassigned doctor cannot create session",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.create(
        connection,
        {
          body: teleSessionBody,
        },
      );
    },
  );

  // 8. Negative: organization admin cannot create telemedicine session as doctor
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    },
  });
  await TestValidator.error(
    "org admin forbidden from telemedicine session creation as doctor",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.create(
        connection,
        {
          body: teleSessionBody,
        },
      );
    },
  );

  // 9. Negative: invalid appointment id (random/unrelated UUID) rejected
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    },
  });
  await TestValidator.error("invalid appointment id rejected", async () => {
    await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.create(
      connection,
      {
        body: {
          ...teleSessionBody,
          appointment_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  });
}
