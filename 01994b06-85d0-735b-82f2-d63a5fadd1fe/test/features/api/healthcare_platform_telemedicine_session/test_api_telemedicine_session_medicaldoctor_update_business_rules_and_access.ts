import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformTelemedicineSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSession";

/**
 * Validates that telemedicine session update honors business rules and access
 * control.
 *
 * 1. Register/Login as Medical Doctor A
 * 2. Create a telemedicine session for Medical Doctor A
 * 3. Update the telemedicine session as Doctor A, check successful update
 * 4. Attempt update with random invalid UUID (should fail)
 * 5. Register/Login as Medical Doctor B and attempt to update Doctor A's session
 *    (should fail)
 * 6. All API responses are typia.assert'ed, errors validated by
 *    TestValidator.error.
 * 7. Attempts to trigger format/body errors are not possible as IUpdate has no
 *    fields.
 */
export async function test_api_telemedicine_session_medicaldoctor_update_business_rules_and_access(
  connection: api.IConnection,
) {
  // 1. Register/Login as Medical Doctor A
  const doctorAEmail = `${RandomGenerator.alphabets(8)}@doctora.example.com`;
  const doctorAJoin = {
    email: doctorAEmail,
    full_name: RandomGenerator.name(),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12) + "Aa1$",
    specialty: RandomGenerator.paragraph({ sentences: 1 }),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const doctorA: IHealthcarePlatformMedicalDoctor.IAuthorized =
    await api.functional.auth.medicalDoctor.join(connection, {
      body: doctorAJoin,
    });
  typia.assert(doctorA);

  // 2. Create Telemedicine Session for Doctor A
  const appointmentId = typia.random<string & tags.Format<"uuid">>();
  const sessionCreateBody = {
    appointment_id: appointmentId,
    join_link: `https://telemed.example.com/session/${RandomGenerator.alphaNumeric(16)}`,
    session_start: new Date(Date.now() + 3600000).toISOString(),
    session_end: new Date(Date.now() + 7200000).toISOString(),
    session_recorded: RandomGenerator.pick([true, false]),
  } satisfies IHealthcarePlatformTelemedicineSession.ICreate;
  const session: IHealthcarePlatformTelemedicineSession =
    await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.create(
      connection,
      { body: sessionCreateBody },
    );
  typia.assert(session);

  // 3. Update the session as Doctor A (no properties allowed to update; business logic path only)
  const updateBody =
    {} satisfies IHealthcarePlatformTelemedicineSession.IUpdate;
  const updatedSession: IHealthcarePlatformTelemedicineSession =
    await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.update(
      connection,
      {
        telemedicineSessionId: session.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSession);
  TestValidator.equals(
    "session ID remains the same after update",
    updatedSession.id,
    session.id,
  );

  // 4. Attempt update with invalid telemedicineSessionId (should error)
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "updating with invalid session ID should fail",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.update(
        connection,
        {
          telemedicineSessionId: fakeId,
          body: updateBody,
        },
      );
    },
  );

  // 5. Register/Login as Medical Doctor B
  const doctorBEmail = `${RandomGenerator.alphabets(8)}@doctorb.example.com`;
  const doctorBJoin = {
    email: doctorBEmail,
    full_name: RandomGenerator.name(),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12) + "Bb2*",
    specialty: RandomGenerator.paragraph({ sentences: 1 }),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const doctorB: IHealthcarePlatformMedicalDoctor.IAuthorized =
    await api.functional.auth.medicalDoctor.join(connection, {
      body: doctorBJoin,
    });
  typia.assert(doctorB);

  // 6. As Doctor B, try to update Doctor A's session (should be denied)
  await TestValidator.error(
    "Doctor B cannot update Doctor A's telemedicine session",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.update(
        connection,
        {
          telemedicineSessionId: session.id,
          body: updateBody,
        },
      );
    },
  );
  // 7. Attempts to send format/body errors for IUpdate are not possible, as body must be empty object.
}
