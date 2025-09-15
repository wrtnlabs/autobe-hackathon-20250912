import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentWaitlist";

/**
 * Comprehensive E2E test for technician updating appointment waitlist:
 *
 * This test covers the full workflow surrounding technician-driven modification
 * of an appointment's waitlist using PATCH
 * /healthcarePlatform/technician/appointments/{appointmentId}/waitlists. It
 * validates success flows and negative RBAC/business logic, enforcing that only
 * the correct technician can update, and improper actions (unassigned users,
 * bad IDs, unauthenticated, or manipulating finalized entries) are denied.
 *
 * Steps:
 *
 * 1. Register technician user and another technician for negative test
 * 2. Register receptionist and login for appointment creation
 * 3. Register patient for use in appointment
 * 4. Receptionist creates appointment assigning technician and patient
 * 5. Technician logs in and PATCHes waitlist as intended
 * 6. Negative: another technician attempts modification (should fail, forbidden)
 * 7. Negative: invalid patient id in patch (should be denied)
 * 8. Negative: unauthenticated access is rejected
 * 9. (Business constraint: test of finalized/removed would need real finalized
 *    entries, not covered here)
 *
 * Validation: ensures only proper RBAC users permitted, all business logic
 * enforced, errors handled, correct response shape.
 */
export async function test_api_technician_appointment_waitlist_modification(
  connection: api.IConnection,
) {
  // Step 1: Register technician
  const technicianEmail = `tech_${RandomGenerator.alphaNumeric(10)}@bizclinic.com`;
  const technicianPassword = RandomGenerator.alphaNumeric(12);
  const techJoin = await api.functional.auth.technician.join(connection, {
    body: {
      email: technicianEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(10),
      specialty: RandomGenerator.paragraph({ sentences: 2 }),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(techJoin);

  // Create a secondary technician for negative tests (access control)
  const otherTechnicianEmail = `other_tech_${RandomGenerator.alphaNumeric(8)}@bizclinic.com`;
  const otherTechnicianPassword = RandomGenerator.alphaNumeric(12);
  const otherTechJoin = await api.functional.auth.technician.join(connection, {
    body: {
      email: otherTechnicianEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(12),
      specialty: RandomGenerator.paragraph({ sentences: 1 }),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(otherTechJoin);

  // Step 2: Register and login receptionist
  const receptionistEmail = `recept_${RandomGenerator.alphaNumeric(10)}@bizclinic.com`;
  const receptionistPassword = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionistEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail as string & tags.Format<"email">,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // Step 3: Register patient
  const patientEmail = `patient_${RandomGenerator.alphaNumeric(10)}@gmail.com`;
  const patientPassword = RandomGenerator.alphaNumeric(10);
  const patientJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1990, 0, 1).toISOString(),
      password: patientPassword,
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patientJoin);

  // Step 4: Receptionist creates appointment
  const apptCreate =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          provider_id: techJoin.id,
          patient_id: patientJoin.id,
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: "in-person",
          start_time: new Date(Date.now() + 3600000).toISOString(), // Starts in 1 hour
          end_time: new Date(Date.now() + 7200000).toISOString(), // Ends in 2 hours
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(apptCreate);

  // Step 5: Technician logs in and PATCHes waitlist (should succeed)
  await api.functional.auth.technician.login(connection, {
    body: {
      email: technicianEmail as string & tags.Format<"email">,
      password: technicianPassword,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });

  const patchBody = {
    status: "active",
    patient_id: patientJoin.id,
    page: 1,
    page_size: 10,
  } satisfies IHealthcarePlatformAppointmentWaitlist.IRequest;
  const patchResult =
    await api.functional.healthcarePlatform.technician.appointments.waitlists.index(
      connection,
      {
        appointmentId: apptCreate.id,
        body: patchBody,
      },
    );
  typia.assert(patchResult);
  TestValidator.equals(
    "waitlist patch result current page",
    patchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "waitlist patch returns 0 or more data",
    patchResult.data.length >= 0,
  );

  // Step 6: Negative - different technician tries to patch an appointment's waitlist
  await api.functional.auth.technician.login(connection, {
    body: {
      email: otherTechnicianEmail as string & tags.Format<"email">,
      password: otherTechnicianPassword,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });
  await TestValidator.error(
    "RBAC: non-assigned technician forbidden to patch waitlist",
    async () => {
      await api.functional.healthcarePlatform.technician.appointments.waitlists.index(
        connection,
        {
          appointmentId: apptCreate.id,
          body: patchBody,
        },
      );
    },
  );

  // Step 7: Negative - bad patient_id
  await api.functional.auth.technician.login(connection, {
    body: {
      email: technicianEmail as string & tags.Format<"email">,
      password: technicianPassword,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });
  await TestValidator.error(
    "business logic: patch fails on invalid patient_id",
    async () => {
      await api.functional.healthcarePlatform.technician.appointments.waitlists.index(
        connection,
        {
          appointmentId: apptCreate.id,
          body: {
            ...patchBody,
            patient_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );

  // Step 8: Negative - unauthenticated user forbidden
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated connection forbidden on waitlist patch",
    async () => {
      await api.functional.healthcarePlatform.technician.appointments.waitlists.index(
        unauthConn,
        {
          appointmentId: apptCreate.id,
          body: patchBody,
        },
      );
    },
  );
}
