import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformTelemedicineSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSession";
import type { IHealthcarePlatformTelemedicineSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSessions";

/**
 * This test validates that an authenticated medical doctor can successfully
 * retrieve the full details of a telemedicine session that is linked to their
 * own appointment. The scenario enforces proper business workflow and
 * multi-role authentication for organization admin and medical doctor,
 * simulates creation of unique users for each, and ensures appointment and
 * session linkage. Session detail retrieval is verified by UUID and negative
 * testing is performed with random (invalid) session ID to confirm error
 * handling and correct permission scopes.
 *
 * Step-by-step process:
 *
 * 1. Register a new organization admin and login for appointment creation.
 * 2. Register a new medical doctor and login as doctor.
 * 3. Organization admin creates an appointment, assigning the above medical doctor
 *    as provider.
 * 4. Medical doctor logs in and creates a telemedicine session, linked to
 *    appointment.
 * 5. Medical doctor retrieves session detail by ID and verifies a structurally
 *    valid response.
 * 6. Negative test: attempt fetch with random UUID to confirm denial.
 *
 * Note: The session detail endpoint returns a container type with no specified
 * fields, so only structural type validity is asserted, not detailed business
 * fields.
 */
export async function test_api_telemedicine_session_medical_doctor_fetch_detail_success(
  connection: api.IConnection,
) {
  // 1. Register Organization Admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgAdmin);

  // 2. Login as Organization Admin for appointment creation
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Register Medical Doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const npiNumber = RandomGenerator.alphaNumeric(10);
  const doctorPassword = RandomGenerator.alphaNumeric(8);
  const doctor: IHealthcarePlatformMedicalDoctor.IAuthorized =
    await api.functional.auth.medicalDoctor.join(connection, {
      body: {
        email: doctorEmail,
        full_name: RandomGenerator.name(),
        npi_number: npiNumber,
        password: doctorPassword,
      } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
    });
  typia.assert(doctor);

  // 4. Login as Medical Doctor (token for next use)
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  // 5. Organization Admin creates appointment
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const appointmentType = "telemedicine";
  const startTime = new Date(Date.now() + 60 * 60000).toISOString();
  const endTime = new Date(Date.now() + 120 * 60000).toISOString();
  const appointment: IHealthcarePlatformAppointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgId,
          provider_id: doctor.id,
          patient_id: patientId,
          status_id: statusId,
          appointment_type: appointmentType,
          start_time: startTime,
          end_time: endTime,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointment);

  // 6. Medical doctor logs in
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  // 7. Medical doctor creates telemedicine session
  const joinLink = `https://telemed.example.com/join/${typia.random<string & tags.Format<"uuid">>()}`;
  const sessionStart = appointment.start_time;
  const sessionEnd = appointment.end_time;
  const teleSession: IHealthcarePlatformTelemedicineSession =
    await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.create(
      connection,
      {
        body: {
          appointment_id: appointment.id,
          join_link: joinLink,
          session_start: sessionStart,
          session_end: sessionEnd,
          session_recorded: false,
        } satisfies IHealthcarePlatformTelemedicineSession.ICreate,
      },
    );
  typia.assert(teleSession);

  // 8. Medical doctor retrieves telemedicine session by ID
  const sessionDetail: IHealthcarePlatformTelemedicineSessions =
    await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.at(
      connection,
      {
        telemedicineSessionId: teleSession.id,
      },
    );
  typia.assert(sessionDetail);
  // Cannot perform field-level TestValidator.equals due to the type definition being an empty container.
  // Only type assertion of response container is possible with the given DTO constraints.

  // 9. Negative test: Fetch with random (invalid) session ID (should throw)
  await TestValidator.error(
    "fetching with invalid telemedicine session id should fail",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.at(
        connection,
        {
          telemedicineSessionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
