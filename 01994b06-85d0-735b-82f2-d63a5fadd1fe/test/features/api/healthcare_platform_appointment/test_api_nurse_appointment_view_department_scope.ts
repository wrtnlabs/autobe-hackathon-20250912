import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Validate nurse RBAC appointment access in department scope
 *
 * - Register department head, nurse, medical doctor, and patient.
 * - Create appointment as department head (with dept, nurse, doctor, patient).
 * - Log in as nurse, retrieve appointment via nurse's endpoint (should succeed).
 * - Try to retrieve another appointment from different department (should fail).
 */
export async function test_api_nurse_appointment_view_department_scope(
  connection: api.IConnection,
) {
  // 1. Register Department Head
  const departmentHeadEmail = RandomGenerator.alphaNumeric(8) + "@org.com";
  const departmentHeadPassword = RandomGenerator.alphaNumeric(12);
  const departmentHead = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: departmentHeadEmail,
        full_name: RandomGenerator.name(),
        password: departmentHeadPassword,
        phone: RandomGenerator.mobile(),
        sso_provider: null,
        sso_provider_key: null,
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    },
  );
  typia.assert(departmentHead);
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const departmentId = typia.random<string & tags.Format<"uuid">>();

  // 2. Register Nurse
  const nurseEmail = RandomGenerator.alphaNumeric(8) + "@hospital.com";
  const nursePassword = RandomGenerator.alphaNumeric(12);
  const nurseLicense = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurseEmail,
      full_name: RandomGenerator.name(),
      license_number: nurseLicense,
      password: nursePassword,
      specialty: "ICU",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformNurse.IJoin,
  });

  // 3. Register Medical Doctor
  const doctorEmail = RandomGenerator.alphaNumeric(8) + "@provider.net";
  const doctorPassword = RandomGenerator.alphaNumeric(12);
  const doctorNPI = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: doctorNPI,
      password: doctorPassword,
      specialty: "Cardiology",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });

  // 4. Register patient
  const patientEmail = RandomGenerator.alphaNumeric(8) + "@mail.com";
  const patientPassword = RandomGenerator.alphaNumeric(12);
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date("1995-06-12").toISOString(),
      password: patientPassword,
      phone: RandomGenerator.mobile(),
      provider: undefined,
      provider_key: undefined,
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patient);

  // 5. Department head logs in (to establish authorization for creating appointment)
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: departmentHeadEmail,
      password: departmentHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 6. Medical doctor logs in (get their id for appointment)
  const docAuth = await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  typia.assert(docAuth);

  // 7. Nurse logs in (get their id for appointment)
  const nurseAuth = await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });
  typia.assert(nurseAuth);

  // 8. Create appointment in same department
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: departmentHeadEmail,
      password: departmentHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  const status_id = typia.random<string & tags.Format<"uuid">>();
  const appointmentCreate = {
    healthcare_platform_organization_id: orgId,
    healthcare_platform_department_id: departmentId,
    provider_id: docAuth.id,
    patient_id: patient.id,
    status_id,
    room_id: null,
    equipment_id: null,
    appointment_type: "in-person",
    start_time: new Date(Date.now() + 3600_000).toISOString(),
    end_time: new Date(Date.now() + 7200_000).toISOString(),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    recurrence_rule: null,
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.departmentHead.appointments.create(
      connection,
      { body: appointmentCreate },
    );
  typia.assert(appointment);

  // 9. Nurse logs in and GETs the appointment - should succeed
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });
  const result = await api.functional.healthcarePlatform.nurse.appointments.at(
    connection,
    {
      appointmentId: appointment.id,
    },
  );
  typia.assert(result);
  TestValidator.equals(
    "nurse should have access to appointment within department",
    result.id,
    appointment.id,
  );

  // 10. Create another department and appointment for negative test
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: departmentHeadEmail,
      password: departmentHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  const otherDepartmentId = typia.random<string & tags.Format<"uuid">>();
  const otherAppointmentCreate = {
    healthcare_platform_organization_id: orgId,
    healthcare_platform_department_id: otherDepartmentId,
    provider_id: docAuth.id,
    patient_id: patient.id,
    status_id: typia.random<string & tags.Format<"uuid">>(),
    room_id: null,
    equipment_id: null,
    appointment_type: "telemedicine",
    start_time: new Date(Date.now() + 10_800_000).toISOString(),
    end_time: new Date(Date.now() + 14_400_000).toISOString(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    recurrence_rule: null,
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const otherAppointment =
    await api.functional.healthcarePlatform.departmentHead.appointments.create(
      connection,
      { body: otherAppointmentCreate },
    );
  typia.assert(otherAppointment);

  // 11. Nurse tries to GET the other department appointment -- should fail
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });
  await TestValidator.error(
    "nurse should NOT have access to appointment outside their department",
    async () => {
      await api.functional.healthcarePlatform.nurse.appointments.at(
        connection,
        {
          appointmentId: otherAppointment.id,
        },
      );
    },
  );
}
