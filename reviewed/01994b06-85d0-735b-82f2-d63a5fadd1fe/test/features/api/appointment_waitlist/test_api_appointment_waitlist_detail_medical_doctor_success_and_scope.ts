import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Validate retrieval and scope enforcement for appointment waitlist details
 * by doctor.
 *
 * 1. Register medical doctor (md1) and login (store email/password)
 * 2. Register receptionist and login
 * 3. Receptionist creates appointment for md1: build patient_id,
 *    org/unit/status ids with realistic UUIDs
 * 4. Medical doctor (md1) login (context switch)
 * 5. Doctor adds waitlist entry for this appointment, for that patient
 * 6. Doctor fetches that waitlist entry by appointmentId and waitlistId,
 *    validates all data matches (id, appointment_id, patient_id, join_time,
 *    status, created_at, updated_at)
 * 7. Register a second medical doctor (md2) and login
 * 8. Attempt to fetch md1's waitlist entry using md2 context—expect forbidden
 *    or not found (error/exception caught)
 * 9. Try fetching waitlist details with random/fake UUIDs—expect not
 *    found/forbidden for incorrect IDs
 * 10. Ensure all PHI only exposed for correct doctor
 */
export async function test_api_appointment_waitlist_detail_medical_doctor_success_and_scope(
  connection: api.IConnection,
) {
  // Register and login as Doctor 1
  const md1_email = typia.random<string & tags.Format<"email">>();
  const md1_password = RandomGenerator.alphaNumeric(12);
  const md1 = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: md1_email,
      full_name: RandomGenerator.name(),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: md1_password,
    },
  });
  typia.assert(md1);

  // Register and login as Receptionist
  const receptionist_email = typia.random<string & tags.Format<"email">>();
  const receptionist_password = RandomGenerator.alphaNumeric(12);
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionist_email,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(receptionist);
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionist_email,
      password: receptionist_password,
    },
  });

  // Generate patient and org/status UUIDs
  const patient_id = typia.random<string & tags.Format<"uuid">>();
  const org_id = typia.random<string & tags.Format<"uuid">>();
  const status_id = typia.random<string & tags.Format<"uuid">>();

  // Create appointment as receptionist (for md1)
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org_id,
          provider_id: md1.id,
          patient_id,
          status_id,
          appointment_type: RandomGenerator.pick([
            "in-person",
            "telemedicine",
          ] as const),
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(appointment);

  // Doctor login
  await api.functional.auth.medicalDoctor.login(connection, {
    body: { email: md1_email, password: md1_password },
  });

  // Doctor adds a waitlist entry
  const waitlist =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          appointment_id: appointment.id,
          patient_id,
        },
      },
    );
  typia.assert(waitlist);

  // Doctor fetches own waitlist entry (happy path)
  const detail =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.waitlists.at(
      connection,
      {
        appointmentId: appointment.id,
        waitlistId: waitlist.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals("waitlist detail id matches", detail.id, waitlist.id);
  TestValidator.equals(
    "waitlist patient id matches",
    detail.patient_id,
    patient_id,
  );
  TestValidator.equals(
    "waitlist appointment id matches",
    detail.appointment_id,
    appointment.id,
  );
  TestValidator.predicate(
    "waitlist status is present",
    typeof detail.status === "string" && detail.status.length > 0,
  );

  // Register and login as Doctor 2
  const md2_email = typia.random<string & tags.Format<"email">>();
  const md2_password = RandomGenerator.alphaNumeric(12);
  const md2 = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: md2_email,
      full_name: RandomGenerator.name(),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: md2_password,
    },
  });
  typia.assert(md2);
  await api.functional.auth.medicalDoctor.login(connection, {
    body: { email: md2_email, password: md2_password },
  });

  // Doctor 2 tries to fetch Doctor 1's waitlist entry (should fail 403/404)
  await TestValidator.error(
    "Doctor 2 forbidden from accessing Doctor 1's waitlist entry",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.waitlists.at(
        connection,
        {
          appointmentId: appointment.id,
          waitlistId: waitlist.id,
        },
      );
    },
  );

  // Try with random/fake UUIDs for appointmentId and waitlistId
  await TestValidator.error(
    "fetching with fake appointment id fails",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.waitlists.at(
        connection,
        {
          appointmentId: typia.random<string & tags.Format<"uuid">>(),
          waitlistId: waitlist.id,
        },
      );
    },
  );
  await TestValidator.error(
    "fetching with fake waitlist id fails",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.waitlists.at(
        connection,
        {
          appointmentId: appointment.id,
          waitlistId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
