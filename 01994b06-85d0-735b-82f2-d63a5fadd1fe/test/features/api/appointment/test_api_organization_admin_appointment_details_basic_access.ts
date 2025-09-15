import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Validate that an organization administrator can access appointment details,
 * with proper authentication and resource scoping.
 *
 * Steps:
 *
 * 1. Register org admin with email/full_name/phone/password.
 * 2. Login as org admin.
 * 3. Create/register a patient.
 * 4. Create/register a medical doctor as provider.
 * 5. Create a valid appointment linking org/patient/provider (random uuid for
 *    status).
 * 6. GET appointment with org admin; validate all fields match creation.
 * 7. Attempt unauthenticated GET - expect error.
 * 8. Attempt GET as other org admin user - expect forbidden/not found.
 * 9. Attempt GET with invalid appointmentId - expect not found.
 */
export async function test_api_organization_admin_appointment_details_basic_access(
  connection: api.IConnection,
) {
  // 1. Register org admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "OrgAdminPass123",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);

  // 2. Login as org admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminJoin.email,
      password: "OrgAdminPass123",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Register patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(
        Date.now() - 25 * 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      phone: RandomGenerator.mobile(),
      password: "PatientPass123",
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patientJoin);

  // 4. Register medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorNpi = RandomGenerator.alphaNumeric(10);
  const doctorJoin = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: doctorNpi,
      password: "DoctorPass123",
      specialty: RandomGenerator.paragraph(),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(doctorJoin);

  // 5. Create appointment with all links set
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const appointmentCreate =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgAdminJoin.id as string &
            tags.Format<"uuid">,
          healthcare_platform_department_id: null,
          provider_id: doctorJoin.id,
          patient_id: patientJoin.id,
          status_id: statusId,
          room_id: null,
          equipment_id: null,
          appointment_type: RandomGenerator.pick([
            "in-person",
            "telemedicine",
          ] as const),
          start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          recurrence_rule: null,
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointmentCreate);

  // 6. Retrieve appointment as org admin
  const appt =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.at(
      connection,
      {
        appointmentId: appointmentCreate.id,
      },
    );
  typia.assert(appt);
  // Validate major Appointment fields
  TestValidator.equals(
    "appointment.id should match",
    appt.id,
    appointmentCreate.id,
  );
  TestValidator.equals(
    "organization id should match",
    appt.healthcare_platform_organization_id,
    appointmentCreate.healthcare_platform_organization_id,
  );
  TestValidator.equals(
    "provider id should match",
    appt.provider_id,
    doctorJoin.id,
  );
  TestValidator.equals(
    "patient id should match",
    appt.patient_id,
    patientJoin.id,
  );
  TestValidator.equals("status id should match", appt.status_id, statusId);
  TestValidator.equals(
    "type should match",
    appt.appointment_type,
    appointmentCreate.appointment_type,
  );
  TestValidator.equals(
    "start_time should match",
    appt.start_time,
    appointmentCreate.start_time,
  );
  TestValidator.equals(
    "end_time should match",
    appt.end_time,
    appointmentCreate.end_time,
  );
  TestValidator.equals(
    "title should match",
    appt.title,
    appointmentCreate.title,
  );
  TestValidator.equals(
    "description should match",
    appt.description,
    appointmentCreate.description,
  );
  TestValidator.equals(
    "recurrence_rule should match",
    appt.recurrence_rule,
    appointmentCreate.recurrence_rule,
  );
  // Minor: check nullable fields are handled correctly
  TestValidator.equals("room_id should match", appt.room_id, null);
  TestValidator.equals("equipment_id should match", appt.equipment_id, null);

  // 7. Attempt unauthenticated GET (no token): expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated org admin should not access appointment details",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointments.at(
        unauthConn,
        {
          appointmentId: appointmentCreate.id,
        },
      );
    },
  );

  // 8. Register/login different org admin; expect not found or forbidden
  const otherOrgAdminEmail = typia.random<string & tags.Format<"email">>();
  const otherOrgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: otherOrgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "OtherOrgAdmin123",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(otherOrgAdminJoin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: otherOrgAdminJoin.email,
      password: "OtherOrgAdmin123",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "org admin of another org should not access appointment",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointments.at(
        connection,
        {
          appointmentId: appointmentCreate.id,
        },
      );
    },
  );

  // 9. Invalid appointment id: expect not found
  await TestValidator.error(
    "nonexistent appointmentId should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointments.at(
        connection,
        {
          appointmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
