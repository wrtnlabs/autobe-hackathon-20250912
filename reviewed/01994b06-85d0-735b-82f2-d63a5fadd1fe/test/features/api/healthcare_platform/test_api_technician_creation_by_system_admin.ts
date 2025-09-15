import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * E2E test for system administrator onboarding technicians.
 *
 * This test simulates a platform system admin registering/logging in and
 * onboarding a technician. Business validation includes unique business email,
 * license number, required fields, and correct data shape. Negative tests cover
 * conflicts on unique fields (email/license), and all responses are validated
 * precisely. Type error scenarios and missing required fields are not tested
 * (as per policy).
 *
 * Steps:
 *
 * 1. Register a system admin via join
 * 2. Login as system admin
 * 3. Onboard a technician (valid payload)
 * 4. Validate response and output structure/fields
 * 5. Attempt duplicate technician creation with same email (should fail)
 * 6. Attempt duplicate technician creation with same license_number (should fail)
 */
export async function test_api_technician_creation_by_system_admin(
  connection: api.IConnection,
) {
  // (1) Register a new system admin
  const adminEmail = `${RandomGenerator.alphabets(6)}@corp-enterprise.com`;
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: adminEmail,
    password: "Str0ng&Secure!123",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;

  const adminAuth: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin email matches",
    adminAuth.email,
    adminJoinBody.email,
  );

  // (2) Login as system admin
  const adminLoginBody = {
    email: adminEmail,
    provider: "local",
    provider_key: adminEmail,
    password: "Str0ng&Secure!123",
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;

  const loginAuth: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loginAuth);
  TestValidator.equals(
    "login returns same admin id",
    loginAuth.id,
    adminAuth.id,
  );

  // (3) Create technician as admin
  const techEmail = `${RandomGenerator.alphabets(8)}@hospital.org`;
  const licenseNumber = RandomGenerator.alphaNumeric(8);
  const techBody = {
    email: techEmail,
    full_name: RandomGenerator.name(2),
    license_number: licenseNumber,
    specialty: RandomGenerator.pick([
      "Radiology",
      "Lab",
      "Phlebotomy",
      "Cardiology",
      "General",
    ] as const),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformTechnician.ICreate;

  const technician: IHealthcarePlatformTechnician =
    await api.functional.healthcarePlatform.systemAdmin.technicians.create(
      connection,
      { body: techBody },
    );
  typia.assert(technician);
  TestValidator.equals("tech email matches", technician.email, techBody.email);
  TestValidator.equals(
    "tech name matches",
    technician.full_name,
    techBody.full_name,
  );
  TestValidator.equals(
    "license number matches",
    technician.license_number,
    techBody.license_number,
  );
  TestValidator.equals(
    "specialty matches",
    technician.specialty ?? null,
    techBody.specialty ?? null,
  );
  TestValidator.equals(
    "phone matches",
    technician.phone ?? null,
    techBody.phone ?? null,
  );
  TestValidator.predicate(
    "tech id is uuid",
    typeof technician.id === "string" && technician.id.length === 36,
  );
  TestValidator.predicate(
    "created_at is date",
    typeof technician.created_at === "string" &&
      technician.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is date",
    typeof technician.updated_at === "string" &&
      technician.updated_at.includes("T"),
  );

  // (4) Attempt to create duplicate technician with same email (should fail)
  await TestValidator.error("reject duplicate technician email", async () => {
    await api.functional.healthcarePlatform.systemAdmin.technicians.create(
      connection,
      {
        body: { ...techBody, license_number: RandomGenerator.alphaNumeric(8) },
      },
    );
  });

  // (5) Attempt to create duplicate technician with same license number (should fail)
  const newEmail = `${RandomGenerator.alphabets(7)}@hospital.org`;
  await TestValidator.error("reject duplicate license number", async () => {
    await api.functional.healthcarePlatform.systemAdmin.technicians.create(
      connection,
      { body: { ...techBody, email: newEmail } },
    );
  });
}
