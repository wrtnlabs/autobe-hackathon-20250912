import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Validate that a department head can retrieve appointment details within their
 * department.
 *
 * Steps:
 *
 * 1. Register department head (unique email/password).
 * 2. Log in as dept head.
 * 3. Register a medical doctor (for provider).
 * 4. Register a patient.
 * 5. Department head creates an appointment with all relevant links.
 * 6. Retrieve appointment with GET
 *    /healthcarePlatform/departmentHead/appointments/{appointmentId}.
 * 7. Confirm data matches creation, and access control is enforced.
 * 8. Negative: Attempt to access outside department or non-existent.
 */
export async function test_api_department_head_appointment_details_department_scope(
  connection: api.IConnection,
) {
  // 1. Register a unique department head
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadPassword = RandomGenerator.alphaNumeric(10);
  const departmentHead = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: deptHeadEmail,
        full_name: RandomGenerator.name(2),
        password: deptHeadPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    },
  );
  typia.assert(departmentHead);

  // 2. Log in as department head
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password: deptHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 3. Register a medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = RandomGenerator.alphaNumeric(10);
  const medicalDoctor = await api.functional.auth.medicalDoctor.join(
    connection,
    {
      body: {
        email: doctorEmail,
        full_name: RandomGenerator.name(2),
        npi_number: RandomGenerator.alphaNumeric(10),
        password: doctorPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
    },
  );
  typia.assert(medicalDoctor);

  // 4. Register a patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientFullName = RandomGenerator.name(3);
  const patientBirth = new Date("1990-01-01").toISOString();
  const patientPassword = RandomGenerator.alphaNumeric(10);
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: patientFullName,
      date_of_birth: patientBirth,
      phone: RandomGenerator.mobile(),
      password: patientPassword,
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patient);

  // 5. Create an appointment as department head
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const departmentId = typia.random<string & tags.Format<"uuid">>();
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const createBody = {
    healthcare_platform_organization_id: organizationId,
    healthcare_platform_department_id: departmentId,
    provider_id: medicalDoctor.id,
    patient_id: patient.id,
    status_id: statusId,
    appointment_type: "in-person",
    start_time: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    end_time: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph(),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const createdAppt =
    await api.functional.healthcarePlatform.departmentHead.appointments.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdAppt);

  // 6. Retrieve appointment by ID via dept head detail endpoint
  const loaded =
    await api.functional.healthcarePlatform.departmentHead.appointments.at(
      connection,
      {
        appointmentId: createdAppt.id,
      },
    );
  typia.assert(loaded);

  // 7. Validate result matches creation (main fields)
  TestValidator.equals("appointment id", loaded.id, createdAppt.id);
  TestValidator.equals(
    "organization id matches",
    loaded.healthcare_platform_organization_id,
    createBody.healthcare_platform_organization_id,
  );
  TestValidator.equals(
    "department id matches",
    loaded.healthcare_platform_department_id,
    createBody.healthcare_platform_department_id,
  );
  TestValidator.equals(
    "provider id matches",
    loaded.provider_id,
    createBody.provider_id,
  );
  TestValidator.equals(
    "patient id matches",
    loaded.patient_id,
    createBody.patient_id,
  );
  TestValidator.equals(
    "status id matches",
    loaded.status_id,
    createBody.status_id,
  );
  TestValidator.equals(
    "appointment type matches",
    loaded.appointment_type,
    createBody.appointment_type,
  );

  // 8. Negative test: appointment not in this department
  // Create appointment in different department
  const otherDeptHeadEmail = typia.random<string & tags.Format<"email">>();
  const otherDeptHeadPassword = RandomGenerator.alphaNumeric(10);
  const otherHead = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: otherDeptHeadEmail,
      full_name: RandomGenerator.name(2),
      password: otherDeptHeadPassword,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  typia.assert(otherHead);

  // LOG IN new department head
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: otherDeptHeadEmail,
      password: otherDeptHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // Try to access the original appointment
  await TestValidator.error(
    "department head cannot access appointment in another department",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.at(
        connection,
        {
          appointmentId: createdAppt.id,
        },
      );
    },
  );

  // 9. Negative test: non-existent appointment
  await TestValidator.error(
    "should return error for non-existent appointmentId",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.at(
        connection,
        {
          appointmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
