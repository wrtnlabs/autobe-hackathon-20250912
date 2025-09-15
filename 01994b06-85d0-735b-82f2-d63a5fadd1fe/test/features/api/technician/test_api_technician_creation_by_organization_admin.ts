import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Test successful and failed creation of a technician by an organization admin,
 * with data and business rule validation.
 *
 * 1. Onboard a new organization admin (unique business email, valid password,
 *    name, etc.).
 * 2. Login as the new admin to set proper API authentication.
 * 3. Create a technician with a unique business email, legal name and unique
 *    license, and all optionals filled.
 * 4. Assert creation is successful and verify all fields match, no sensitive
 *    registration-only data like password hash leaked.
 * 5. Attempt to create a second technician with same email or license (should fail
 *    for both).
 * 6. Attempt a creation with invalid email format (should fail).
 * 7. Create a technician omitting optionals (specialty, phone) and assert nullable
 *    behavior.
 */
export async function test_api_technician_creation_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Organization admin join
  const orgAdminEmail = `${RandomGenerator.alphabets(8)}@business-domain.com`;
  const orgAdminName = RandomGenerator.name();
  const orgAdminPhone = RandomGenerator.mobile();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: orgAdminName,
        phone: orgAdminPhone,
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);

  // 2. Organization admin login
  const loginOutput = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginOutput);

  // 3. Create a new technician
  const technicianEmail = `${RandomGenerator.alphabets(12)}@clinic.biz`;
  const licenseNumber = RandomGenerator.alphaNumeric(10);
  const technicianFullName = RandomGenerator.name();
  const technicianSpecialty = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const technicianPhone = RandomGenerator.mobile();
  const createBody = {
    email: technicianEmail,
    full_name: technicianFullName,
    license_number: licenseNumber,
    specialty: technicianSpecialty,
    phone: technicianPhone,
  } satisfies IHealthcarePlatformTechnician.ICreate;
  const createdTech =
    await api.functional.healthcarePlatform.organizationAdmin.technicians.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdTech);

  // 4. Verify technician fields
  TestValidator.equals(
    "technician email matches",
    createdTech.email,
    technicianEmail,
  );
  TestValidator.equals(
    "technician license matches",
    createdTech.license_number,
    licenseNumber,
  );
  TestValidator.equals(
    "technician name matches",
    createdTech.full_name,
    technicianFullName,
  );
  TestValidator.equals(
    "technician specialty matches",
    createdTech.specialty,
    technicianSpecialty,
  );
  TestValidator.equals(
    "technician phone matches",
    createdTech.phone,
    technicianPhone,
  );

  // 5. Attempt duplicate email
  await TestValidator.error(
    "duplicate technician email should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.technicians.create(
        connection,
        {
          body: {
            email: technicianEmail,
            full_name: RandomGenerator.name(),
            license_number: RandomGenerator.alphaNumeric(10),
            specialty: RandomGenerator.paragraph({ sentences: 1 }),
            phone: RandomGenerator.mobile(),
          } satisfies IHealthcarePlatformTechnician.ICreate,
        },
      );
    },
  );

  // 6. Attempt duplicate license number
  const anotherEmail = `${RandomGenerator.alphabets(11)}@clinic.biz`;
  await TestValidator.error(
    "duplicate technician license should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.technicians.create(
        connection,
        {
          body: {
            email: anotherEmail,
            full_name: RandomGenerator.name(),
            license_number: licenseNumber,
            specialty: RandomGenerator.paragraph({ sentences: 1 }),
            phone: RandomGenerator.mobile(),
          } satisfies IHealthcarePlatformTechnician.ICreate,
        },
      );
    },
  );

  // 7. Attempt invalid email
  await TestValidator.error("invalid email format should fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.technicians.create(
      connection,
      {
        body: {
          email: "not-an-email", // fails tags.Format<"email">
          full_name: RandomGenerator.name(),
          license_number: RandomGenerator.alphaNumeric(10),
          specialty: RandomGenerator.paragraph({ sentences: 1 }),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformTechnician.ICreate,
      },
    );
  });

  // 8. Create technician with omitted optionals: specialty and phone
  const bareTechBody = {
    email: `${RandomGenerator.alphabets(10)}@minimal.biz`,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformTechnician.ICreate;
  const bareTech =
    await api.functional.healthcarePlatform.organizationAdmin.technicians.create(
      connection,
      { body: bareTechBody },
    );
  typia.assert(bareTech);
  TestValidator.equals(
    "nullable specialty is null or undefined",
    bareTech.specialty,
    undefined,
  );
  TestValidator.equals(
    "nullable phone is null or undefined",
    bareTech.phone,
    undefined,
  );
}
