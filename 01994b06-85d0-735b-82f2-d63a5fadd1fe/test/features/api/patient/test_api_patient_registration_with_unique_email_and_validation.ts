import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Test patient self-registration with enforcement of unique email, password/SSO
 * branch, and business field validation. Verifies that successful registration
 * delivers an authenticated session/token, populates audit fields, and upholds
 * all required attributes. Tests join logic for plain password and for
 * SSO-based registration. Also asserts that duplicate registration attempts (by
 * email) fail.
 */
export async function test_api_patient_registration_with_unique_email_and_validation(
  connection: api.IConnection,
) {
  // --- Prepare input (random but valid patient identity and profile fields) ---
  const email = typia.random<string & tags.Format<"email">>();
  const full_name = RandomGenerator.name();
  const date_of_birth = new Date(
    RandomGenerator.date(new Date(1970, 0, 1), 1000 * 60 * 60 * 24 * 365 * 40),
  ).toISOString();
  const phone = RandomGenerator.mobile();
  const password = RandomGenerator.alphaNumeric(12) + "AB!"; // Simulate complexity

  // --- Plain password registration ---
  const join_body = {
    email,
    full_name,
    date_of_birth,
    phone,
    password,
  } satisfies IHealthcarePlatformPatient.IJoin;
  const join_result = await api.functional.auth.patient.join(connection, {
    body: join_body,
  });
  typia.assert(join_result);
  TestValidator.equals("registered email matches", join_result.email, email);
  TestValidator.equals(
    "registered name matches",
    join_result.full_name,
    full_name,
  );
  TestValidator.equals(
    "registered date_of_birth matches",
    join_result.date_of_birth,
    date_of_birth,
  );
  TestValidator.equals("registered phone matches", join_result.phone, phone);
  TestValidator.predicate(
    "token present in result",
    !!join_result.token && typeof join_result.token.access === "string",
  );
  TestValidator.predicate(
    "account is active",
    join_result.deleted_at === null || join_result.deleted_at === undefined,
  );
  TestValidator.predicate(
    "created_at is valid",
    typeof join_result.created_at === "string" &&
      join_result.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    typeof join_result.updated_at === "string" &&
      join_result.updated_at.length > 0,
  );

  // --- Attempt duplicate join (should fail due to unique email) ---
  await TestValidator.error("duplicate email rejected", async () => {
    await api.functional.auth.patient.join(connection, { body: join_body });
  });

  // --- SSO registration branch (password omitted, provider+provider_key present) ---
  const email2 = typia.random<string & tags.Format<"email">>();
  const sso_body = {
    email: email2,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(
      RandomGenerator.date(
        new Date(1970, 0, 1),
        1000 * 60 * 60 * 24 * 365 * 20,
      ),
    ).toISOString(),
    provider: "oauth2",
    provider_key: RandomGenerator.alphaNumeric(24),
    // phone omitted to test optionals
  } satisfies IHealthcarePlatformPatient.IJoin;
  const join_result_sso = await api.functional.auth.patient.join(connection, {
    body: sso_body,
  });
  typia.assert(join_result_sso);
  TestValidator.equals("SSO email matches", join_result_sso.email, email2);
  TestValidator.equals(
    "provider-joined name matches",
    join_result_sso.full_name,
    sso_body.full_name,
  );
  TestValidator.predicate(
    "token present for SSO",
    !!join_result_sso.token && typeof join_result_sso.token.access === "string",
  );
  TestValidator.predicate(
    "created_at for SSO valid",
    typeof join_result_sso.created_at === "string" &&
      join_result_sso.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at for SSO valid",
    typeof join_result_sso.updated_at === "string" &&
      join_result_sso.updated_at.length > 0,
  );
  TestValidator.predicate(
    "account is active for SSO",
    join_result_sso.deleted_at === null ||
      join_result_sso.deleted_at === undefined,
  );

  // --- Plain provisioning via /healthcarePlatform/patient/patients (POST) ---
  const create_body = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(
      RandomGenerator.date(
        new Date(1970, 0, 1),
        1000 * 60 * 60 * 24 * 365 * 50,
      ),
    ).toISOString(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.ICreate;
  const created =
    await api.functional.healthcarePlatform.patient.patients.create(
      connection,
      { body: create_body },
    );
  typia.assert(created);
  TestValidator.equals(
    "provisioned patient email matches",
    created.email,
    create_body.email,
  );
  TestValidator.equals(
    "provisioned patient name matches",
    created.full_name,
    create_body.full_name,
  );
  TestValidator.equals(
    "provisioned date_of_birth matches",
    created.date_of_birth,
    create_body.date_of_birth,
  );
  TestValidator.equals(
    "provisioned phone matches",
    created.phone,
    create_body.phone,
  );

  // --- Negative test: duplicate email for provisioning is rejected ---
  await TestValidator.error(
    "duplicate email on create is rejected",
    async () => {
      await api.functional.healthcarePlatform.patient.patients.create(
        connection,
        { body: create_body },
      );
    },
  );
}
