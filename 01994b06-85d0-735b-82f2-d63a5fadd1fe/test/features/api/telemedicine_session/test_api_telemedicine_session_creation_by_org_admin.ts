import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformTelemedicineSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSession";

/**
 * Validate creation of a telemedicine session by organization admin, covering
 * successful and error scenarios.
 *
 * Steps:
 *
 * 1. Register an organization admin with unique random credentials.
 * 2. Log in as this admin.
 * 3. Create a healthcare appointment with realistic, type-valid values.
 * 4. Create a telemedicine session for the appointment, with required fields.
 * 5. Validate the session references the appointment and core fields are correct.
 * 6. Error: Try to create a session for an unknown (random) appointment_id.
 * 7. Error: Try to create multiple sessions for the same appointment (should
 *    fail).
 */
export async function test_api_telemedicine_session_creation_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Register org admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminFullName = RandomGenerator.name();
  const orgAdminPhone = RandomGenerator.mobile();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);

  const adminJoinRes = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: orgAdminFullName,
        phone: orgAdminPhone,
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoinRes);
  TestValidator.equals(
    "org admin email matches",
    adminJoinRes.email,
    orgAdminEmail,
  );
  TestValidator.equals(
    "org admin name matches",
    adminJoinRes.full_name,
    orgAdminFullName,
  );

  // 2. Log in as org admin
  const adminLoginRes = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminLoginRes);
  TestValidator.equals("login org admin id", adminLoginRes.id, adminJoinRes.id);

  // 3. Create appointment
  const appointmentOrgId = typia.random<string & tags.Format<"uuid">>();
  const appointmentProviderId = typia.random<string & tags.Format<"uuid">>();
  const appointmentPatientId = typia.random<string & tags.Format<"uuid">>();
  const appointmentStatusId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1hr from now
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(); // 2hr from now
  const appointmentTitle = RandomGenerator.paragraph({ sentences: 3 });

  const appointmentRes =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: appointmentOrgId,
          provider_id: appointmentProviderId,
          patient_id: appointmentPatientId,
          status_id: appointmentStatusId,
          appointment_type: "telemedicine",
          start_time: start,
          end_time: end,
          title: appointmentTitle,
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointmentRes);
  TestValidator.equals(
    "appointment org matches",
    appointmentRes.healthcare_platform_organization_id,
    appointmentOrgId,
  );
  TestValidator.equals(
    "appointment provider matches",
    appointmentRes.provider_id,
    appointmentProviderId,
  );
  TestValidator.equals(
    "appointment patient matches",
    appointmentRes.patient_id,
    appointmentPatientId,
  );

  // 4. Create telemedicine session
  const teleJoinLink = `https://teleconf.example.com/${typia.random<string & tags.Format<"uuid">>()}`;
  const teleSessionStart = start;
  const teleSessionEnd = end;

  const teleSessionRes =
    await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.create(
      connection,
      {
        body: {
          appointment_id: appointmentRes.id,
          join_link: teleJoinLink,
          session_start: teleSessionStart,
          session_end: teleSessionEnd,
          session_recorded: true,
        } satisfies IHealthcarePlatformTelemedicineSession.ICreate,
      },
    );
  typia.assert(teleSessionRes);
  TestValidator.equals(
    "session appointment_id matches",
    teleSessionRes.appointment_id,
    appointmentRes.id,
  );
  TestValidator.equals(
    "join_link matches",
    teleSessionRes.join_link,
    teleJoinLink,
  );
  TestValidator.equals(
    "session start matches",
    teleSessionRes.session_start,
    teleSessionStart,
  );
  TestValidator.equals(
    "session end matches",
    teleSessionRes.session_end,
    teleSessionEnd,
  );
  TestValidator.equals(
    "session_recorded flag",
    teleSessionRes.session_recorded,
    true,
  );

  // 5. Error: Non-existent appointment id
  const fakeAppointmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "error when appointment_id does not exist",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.create(
        connection,
        {
          body: {
            appointment_id: fakeAppointmentId,
            join_link: "https://invalid.example.com/room",
            session_start: teleSessionStart,
            session_end: teleSessionEnd,
            session_recorded: false,
          } satisfies IHealthcarePlatformTelemedicineSession.ICreate,
        },
      );
    },
  );

  // 6. Error: Duplicate session for same appointment
  await TestValidator.error(
    "error when creating duplicate session for same appointment",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.create(
        connection,
        {
          body: {
            appointment_id: appointmentRes.id,
            join_link: `https://teleconf.example.com/${typia.random<string & tags.Format<"uuid">>()}`,
            session_start: teleSessionStart,
            session_end: teleSessionEnd,
            session_recorded: true,
          } satisfies IHealthcarePlatformTelemedicineSession.ICreate,
        },
      );
    },
  );
}
