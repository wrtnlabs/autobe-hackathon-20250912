import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";

/**
 * Validate end-to-end onboarding (join) for medical doctor accounts via POST
 * /auth/medicalDoctor/join.
 *
 * Covers:
 *
 * 1. Happy path: Registers a new doctor with random, unique business email and
 *    NPI; verifies complete authorized profile and issued JWT.
 * 2. Duplicate email: Re-attempts with same email, new NPI, expects business
 *    error.
 * 3. Duplicate NPI: Re-attempts with new email, same NPI, expects business error.
 * 4. Weak password: Attempts registration with sub-8-char password, expects error.
 * 5. Missing required fields: Attempts with null/missing full_name and email,
 *    expects error.
 * 6. Sensitive credential block: Confirms in all responses that no password/hash
 *    or similar is ever exposed.
 *
 * All success responses validated with typia.assert and field-level logic
 * checks.
 */
export async function test_api_medical_doctor_registration_flow(
  connection: api.IConnection,
) {
  // 1. Happy path: unique join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(2),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12) + "Q1!a", // Strong, min 8 chars
    specialty: RandomGenerator.name(1),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const joined = await api.functional.auth.medicalDoctor.join(connection, {
    body: joinBody,
  });
  typia.assert<IHealthcarePlatformMedicalDoctor.IAuthorized>(joined);
  // JWT token: typia.assert on IAuthorizationToken
  typia.assert<IAuthorizationToken>(joined.token);
  // Email, NPI, name roundtrip:
  TestValidator.equals("returned email matches", joined.email, joinBody.email);
  TestValidator.equals(
    "returned full_name matches",
    joined.full_name,
    joinBody.full_name,
  );
  TestValidator.equals(
    "returned npi_number matches",
    joined.npi_number,
    joinBody.npi_number,
  );
  TestValidator.equals(
    "returned specialty matches",
    joined.specialty,
    joinBody.specialty,
  );
  TestValidator.equals("returned phone matches", joined.phone, joinBody.phone);
  // None of these should ever appear in response:
  TestValidator.predicate(
    "no password field",
    !Object.hasOwn(joined, "password"),
  );
  TestValidator.predicate(
    "no password_hash field",
    !Object.hasOwn(joined, "password_hash"),
  );
  TestValidator.predicate("no hash field", !Object.hasOwn(joined, "hash"));

  // 2. Duplicate email: must fail
  await TestValidator.error("duplicate email join fails", async () => {
    await api.functional.auth.medicalDoctor.join(connection, {
      body: {
        ...joinBody,
        npi_number: RandomGenerator.alphaNumeric(10),
      },
    });
  });

  // 3. Duplicate NPI: must fail
  await TestValidator.error("duplicate NPI join fails", async () => {
    await api.functional.auth.medicalDoctor.join(connection, {
      body: {
        ...joinBody,
        email: typia.random<string & tags.Format<"email">>(),
      },
    });
  });

  // 4. Weak password: must fail
  await TestValidator.error("weak password join fails", async () => {
    await api.functional.auth.medicalDoctor.join(connection, {
      body: {
        ...joinBody,
        email: typia.random<string & tags.Format<"email">>(),
        npi_number: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(4),
      },
    });
  });

  // 5. Missing required fields: must fail
  await TestValidator.error(
    "missing required full_name join fails",
    async () => {
      await api.functional.auth.medicalDoctor.join(connection, {
        body: {
          ...joinBody,
          full_name: undefined as never,
        },
      });
    },
  );
  await TestValidator.error("missing required email join fails", async () => {
    await api.functional.auth.medicalDoctor.join(connection, {
      body: {
        ...joinBody,
        email: undefined as never,
      },
    });
  });

  // 6. Sensitive fields - check again with a fresh join
  const freshJoin = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      ...joinBody,
      email: typia.random<string & tags.Format<"email">>(),
      npi_number: RandomGenerator.alphaNumeric(10),
    },
  });
  typia.assert(freshJoin);
  TestValidator.predicate(
    "no password in re-join response",
    !Object.hasOwn(freshJoin, "password"),
  );
  TestValidator.predicate(
    "no hash in re-join response",
    !Object.hasOwn(freshJoin, "hash"),
  );
}
