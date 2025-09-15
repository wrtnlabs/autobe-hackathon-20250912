import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Validate deletion and permission rules for healthcare appointments, focusing
 * on medical doctor access.
 *
 * 1. Register and login as medical doctor (A)
 * 2. Register and login as receptionist (B)
 * 3. Receptionist (B) creates an appointment, assign doctor A as provider
 * 4. Doctor (A) logs in and deletes the appointment
 * 5. Try to delete the appointment again (expect failure)
 * 6. Try to delete appointment as a different doctor (expect failure)
 * 7. Create another appointment with different doctor, try cross-delete
 * 8. Negative: Try to delete non-existent appointment (expect failure)
 */
export async function test_api_appointment_deletion_by_medical_doctor_permission_and_validation(
  connection: api.IConnection,
) {
  // 1. Register doctor A
  const doctorA_email = typia.random<string & tags.Format<"email">>();
  const doctorA_password = RandomGenerator.alphaNumeric(12);
  const doctorA_join = await api.functional.auth.medicalDoctor.join(
    connection,
    {
      body: {
        email: doctorA_email,
        full_name: RandomGenerator.name(),
        npi_number: RandomGenerator.alphaNumeric(10),
        password: doctorA_password as string & tags.Format<"password">,
      } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
    },
  );
  typia.assert(doctorA_join);

  // 2. Register doctor B (for cross-doctor negative test)
  const doctorB_email = typia.random<string & tags.Format<"email">>();
  const doctorB_password = RandomGenerator.alphaNumeric(12);
  const doctorB_join = await api.functional.auth.medicalDoctor.join(
    connection,
    {
      body: {
        email: doctorB_email,
        full_name: RandomGenerator.name(),
        npi_number: RandomGenerator.alphaNumeric(10),
        password: doctorB_password as string & tags.Format<"password">,
      } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
    },
  );
  typia.assert(doctorB_join);

  // 3. Register receptionist
  const receptionist_email = typia.random<string & tags.Format<"email">>();
  const receptionist_password = RandomGenerator.alphaNumeric(12);
  const receptionist_join = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionist_email,
        full_name: RandomGenerator.name(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionist_join);

  // Receptionist logs in
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionist_email,
      password: receptionist_password,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 4. Receptionist creates appointment for doctor A
  const appointmentA =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          provider_id: doctorA_join.id,
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: "in-person",
          start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointmentA);

  // 5. Doctor A logs in and deletes their appointment (success)
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorA_email,
      password: doctorA_password,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  await api.functional.healthcarePlatform.medicalDoctor.appointments.erase(
    connection,
    {
      appointmentId: appointmentA.id,
    },
  );

  // 6. Attempt to delete the appointment again (should fail)
  await TestValidator.error(
    "Second delete by doctor A should fail",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.erase(
        connection,
        {
          appointmentId: appointmentA.id,
        },
      );
    },
  );

  // 7. Doctor B logs in
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorB_email,
      password: doctorB_password,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  // Doctor B tries to delete doctor A's (already deleted) appointment (should fail)
  await TestValidator.error(
    "Doctor B cannot delete doctor A's appointment",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.erase(
        connection,
        {
          appointmentId: appointmentA.id,
        },
      );
    },
  );

  // 8. Receptionist logs back in, creates an appointment for doctor B
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionist_email,
      password: receptionist_password,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });
  const appointmentB =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          provider_id: doctorB_join.id,
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: "in-person",
          start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointmentB);

  // 9. Doctor A logs in, tries to delete doctor B's appointment (should fail)
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorA_email,
      password: doctorA_password,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  await TestValidator.error(
    "Doctor A cannot delete doctor B's appointment",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.erase(
        connection,
        {
          appointmentId: appointmentB.id,
        },
      );
    },
  );

  // 10. Doctor B logs in, deletes own appointment (success)
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorB_email,
      password: doctorB_password,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  await api.functional.healthcarePlatform.medicalDoctor.appointments.erase(
    connection,
    {
      appointmentId: appointmentB.id,
    },
  );

  // 11. Doctor B tries to delete appointmentB again (should fail)
  await TestValidator.error(
    "Doctor B cannot double-delete their own appointment",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.erase(
        connection,
        {
          appointmentId: appointmentB.id,
        },
      );
    },
  );

  // 12. Doctor B tries to delete a non-existent appointment (should fail)
  await TestValidator.error(
    "Doctor B cannot delete non-existent appointment",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.erase(
        connection,
        {
          appointmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
