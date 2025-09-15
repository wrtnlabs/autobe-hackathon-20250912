import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformTelemedicineSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSession";

/**
 * Ensure medical doctor can delete their assigned telemedicine session, and
 * test errors
 *
 * 1. Register a unique medical doctor account for the test and authenticate.
 * 2. Create a telemedicine session as the doctor.
 * 3. Delete the telemedicine session using its sessionId.
 * 4. Verify deletion by attempting to delete again (should fail with error).
 * 5. Attempt to delete a random non-existent session (should error).
 * 6. Register and authenticate a second doctor, then attempt to delete the first
 *    session (should fail with forbidden/error).
 *
 * Success: only the assigned doctor can delete their session. Non-existent or
 * unauthorized deletes error.
 */
export async function test_api_telemedicine_session_deletion_by_medical_doctor_success(
  connection: api.IConnection,
) {
  // 1. Register medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = RandomGenerator.alphaNumeric(12);
  const doctorNpi = RandomGenerator.alphaNumeric(10);
  const joinDoctor: IHealthcarePlatformMedicalDoctor.IAuthorized =
    await api.functional.auth.medicalDoctor.join(connection, {
      body: {
        email: doctorEmail,
        full_name: RandomGenerator.name(),
        npi_number: doctorNpi,
        password: doctorPassword,
      } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
    });
  typia.assert(joinDoctor);

  // 2. Login as the doctor (auth context set by SDK)
  const loggedDoctor: IHealthcarePlatformMedicalDoctor.IAuthorized =
    await api.functional.auth.medicalDoctor.login(connection, {
      body: {
        email: doctorEmail,
        password: doctorPassword,
      } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
    });
  typia.assert(loggedDoctor);

  // 3. Create telemedicine session assigned to this doctor
  const telemedicineSession: IHealthcarePlatformTelemedicineSession =
    await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.create(
      connection,
      {
        body: {
          appointment_id: typia.random<string & tags.Format<"uuid">>(),
          join_link: RandomGenerator.alphaNumeric(24),
          session_start: new Date().toISOString(),
          session_end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          session_recorded: false,
        } satisfies IHealthcarePlatformTelemedicineSession.ICreate,
      },
    );
  typia.assert(telemedicineSession);

  // 4. Delete the telemedicine session
  await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.erase(
    connection,
    {
      telemedicineSessionId: telemedicineSession.id,
    },
  );

  // 5. Confirm that deletion works - try deleting again, should error
  await TestValidator.error(
    "deleting already deleted session errors",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.erase(
        connection,
        {
          telemedicineSessionId: telemedicineSession.id,
        },
      );
    },
  );

  // 6. Delete a random (non-existent) telemedicineSessionId
  await TestValidator.error("deleting non-existent session fails", async () => {
    await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.erase(
      connection,
      {
        telemedicineSessionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 7. Register a second doctor & login as second doctor
  const doctor2Email = typia.random<string & tags.Format<"email">>();
  const doctor2Password = RandomGenerator.alphaNumeric(12);
  const doctor2Npi = RandomGenerator.alphaNumeric(10);
  const doctor2: IHealthcarePlatformMedicalDoctor.IAuthorized =
    await api.functional.auth.medicalDoctor.join(connection, {
      body: {
        email: doctor2Email,
        full_name: RandomGenerator.name(),
        npi_number: doctor2Npi,
        password: doctor2Password,
      } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
    });
  typia.assert(doctor2);
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctor2Email,
      password: doctor2Password,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  // 8. Try deleting session as different doctor, should fail (forbidden)
  await TestValidator.error("other doctor cannot delete session", async () => {
    await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.erase(
      connection,
      {
        telemedicineSessionId: telemedicineSession.id,
      },
    );
  });
}
