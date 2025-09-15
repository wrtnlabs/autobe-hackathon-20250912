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
 * Validate that an authenticated medical doctor can only access appointment
 * details where they are the provider.
 *
 * 1. Register & log in as a medical doctor (capture credentials and id)
 * 2. Register a patient (capture id)
 * 3. Register & log in as an organization admin
 * 4. Create an appointment as org admin: provider=medical doctor, patient=patient
 * 5. Log back in as medical doctor
 * 6. Call GET /healthcarePlatform/medicalDoctor/appointments/{appointmentId}
 * 7. Validate details (provider, patient, organization, etc)
 * 8. Validate error if fetching appointment that is not assigned to doctor
 * 9. Validate error if fetching nonexistent appointment
 */
export async function test_api_medical_doctor_appointment_read_access(
  connection: api.IConnection,
) {
  // 1. Register medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = RandomGenerator.alphaNumeric(12);
  const doctorNPI = RandomGenerator.alphaNumeric(10);
  const doctorJoinBody = {
    email: doctorEmail,
    full_name: RandomGenerator.name(),
    npi_number: doctorNPI,
    password: doctorPassword satisfies string,
    specialty: RandomGenerator.name(1),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: doctorJoinBody,
  });
  typia.assert(doctor);

  // 2. Register patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientJoinBody = {
    email: patientEmail,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 365 * 25,
    ).toISOString(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patient = await api.functional.auth.patient.join(connection, {
    body: patientJoinBody,
  });
  typia.assert(patient);

  // 3. Register and login as organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    password: adminPassword satisfies string,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. Create appointment as org admin
  const startTime = new Date(Date.now() + 1000 * 60 * 60).toISOString();
  const endTime = new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString();
  const appointmentCreateBody = {
    healthcare_platform_organization_id: admin.id,
    provider_id: doctor.id,
    patient_id: patient.id,
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
    ] as const),
    start_time: startTime,
    end_time: endTime,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    recurrence_rule: undefined,
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      { body: appointmentCreateBody },
    );
  typia.assert(appointment);

  // 5. Log in as medical doctor
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  // 6. Get the appointment as medical doctor
  const got =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.at(
      connection,
      { appointmentId: appointment.id },
    );
  typia.assert(got);
  TestValidator.equals(
    "provider must match doctor",
    got.provider_id,
    doctor.id,
  );
  TestValidator.equals(
    "patient must match patient",
    got.patient_id,
    patient.id,
  );
  TestValidator.equals(
    "organization id must match admin's org",
    got.healthcare_platform_organization_id,
    admin.id,
  );
  TestValidator.equals("title matches", got.title, appointment.title);
  TestValidator.equals(
    "appointment_type matches",
    got.appointment_type,
    appointment.appointment_type,
  );
  TestValidator.equals(
    "start_time matches",
    got.start_time,
    appointment.start_time,
  );
  TestValidator.equals("end_time matches", got.end_time, appointment.end_time);

  // 8. Negative scenario: create appointment with different provider
  const otherDoctorEmail = typia.random<string & tags.Format<"email">>();
  const otherDoctorPassword = RandomGenerator.alphaNumeric(12);
  const otherDoctorNPI = RandomGenerator.alphaNumeric(10);
  const otherDoctorJoinBody = {
    email: otherDoctorEmail,
    full_name: RandomGenerator.name(),
    npi_number: otherDoctorNPI,
    password: otherDoctorPassword satisfies string,
    specialty: RandomGenerator.name(1),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const otherDoctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: otherDoctorJoinBody,
  });
  typia.assert(otherDoctor);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  const anotherAppointmentCreateBody = {
    healthcare_platform_organization_id: admin.id,
    provider_id: otherDoctor.id,
    patient_id: patient.id,
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
    ] as const),
    start_time: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    end_time: new Date(Date.now() + 1000 * 60 * 60 * 25).toISOString(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    recurrence_rule: undefined,
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const anotherAppointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      { body: anotherAppointmentCreateBody },
    );
  typia.assert(anotherAppointment);

  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  await TestValidator.error(
    "doctor cannot access appointment where not provider",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.at(
        connection,
        { appointmentId: anotherAppointment.id },
      );
    },
  );

  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "doctor cannot access nonexistent appointment",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.at(
        connection,
        { appointmentId: fakeId },
      );
    },
  );
}
