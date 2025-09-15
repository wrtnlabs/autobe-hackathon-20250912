import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";

/**
 * Comprehensive E2E login flow for medical doctor accounts.
 *
 * 1. Register a unique medical doctor with random, valid credentials
 * 2. Login with correct credentials (should succeed)
 * 3. Login with wrong password (should fail)
 * 4. Login with non-existent email (should fail)
 * 5. (Deactivation edge case acknowledged but not implementable with current SDK)
 *
 * Each error scenario ensures no sensitive data is leaked and that business
 * rules are enforced.
 */
export async function test_api_medical_doctor_login_flow(
  connection: api.IConnection,
) {
  // Step 1: Register a unique medical doctor
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(2),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12) satisfies string as string,
    specialty: RandomGenerator.name(1),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;

  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: joinInput,
  });
  typia.assert(doctor);
  TestValidator.equals(
    "doctor email matches registration",
    doctor.email,
    joinInput.email,
  );
  TestValidator.equals(
    "doctor NPI matches registration",
    doctor.npi_number,
    joinInput.npi_number,
  );
  TestValidator.equals(
    "doctor full_name matches registration",
    doctor.full_name,
    joinInput.full_name,
  );
  TestValidator.equals(
    "registered specialty",
    doctor.specialty,
    joinInput.specialty,
  );
  TestValidator.equals("registered phone", doctor.phone, joinInput.phone);
  TestValidator.predicate(
    "doctor token is present",
    !!doctor.token?.access && !!doctor.token?.refresh,
  );
  TestValidator.predicate(
    "doctor password is not leaked",
    !("password" in doctor),
  );

  // Step 2: Successful login
  const loginResult = await api.functional.auth.medicalDoctor.login(
    connection,
    {
      body: {
        email: joinInput.email,
        password: joinInput.password,
      } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
    },
  );
  typia.assert(loginResult);
  TestValidator.equals(
    "login email matches registration",
    loginResult.email,
    joinInput.email,
  );
  TestValidator.equals(
    "login full name matches registration",
    loginResult.full_name,
    joinInput.full_name,
  );
  TestValidator.equals(
    "login NPI matches registration",
    loginResult.npi_number,
    joinInput.npi_number,
  );
  TestValidator.predicate(
    "login returns tokens",
    !!loginResult.token?.access && !!loginResult.token?.refresh,
  );
  TestValidator.predicate(
    "login does not leak password",
    !("password" in loginResult),
  );

  // Step 3: Login with wrong password should fail
  await TestValidator.error("login fails for wrong password", async () => {
    await api.functional.auth.medicalDoctor.login(connection, {
      body: {
        email: joinInput.email,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
    });
  });

  // Step 4: Login with non-existent account should fail
  await TestValidator.error("login fails for non-existent email", async () => {
    await api.functional.auth.medicalDoctor.login(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: joinInput.password,
      } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
    });
  });
}
