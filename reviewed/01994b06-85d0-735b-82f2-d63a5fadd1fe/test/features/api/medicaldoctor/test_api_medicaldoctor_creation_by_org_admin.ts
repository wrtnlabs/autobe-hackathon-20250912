import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Ensure organization admin can onboard a new medical doctor, enforce org
 * scoping, and block duplicates.
 *
 * 1. Register and authenticate as an organization admin (OrgA)
 * 2. Create a new doctor (unique email/NPI)
 * 3. Assert doctor is created and fields match input
 * 4. Try to create doctor with the same email (should fail - duplicate email)
 * 5. Try to create doctor with the same NPI (should fail - duplicate NPI)
 * 6. Register and authenticate as another organization admin (OrgB)
 * 7. Attempt to create a doctor in OrgB using OrgA doctor credentials (should fail
 *    or be isolated per org-scoping)
 */
export async function test_api_medicaldoctor_creation_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Register & authenticate OrgA admin
  const orgAdminAEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminA: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminAEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "OrgAdminPass123!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgAdminA);
  TestValidator.equals(
    "registered orgAdmin email matches input",
    orgAdminA.email,
    orgAdminAEmail,
  );

  // 2. Doctor creation in OrgA
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorNPI = RandomGenerator.alphaNumeric(10);
  const doctorInput = {
    email: doctorEmail,
    full_name: RandomGenerator.name(),
    npi_number: doctorNPI,
    specialty: "Oncology",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.ICreate;
  const doctor: IHealthcarePlatformMedicalDoctor =
    await api.functional.healthcarePlatform.organizationAdmin.medicaldoctors.create(
      connection,
      {
        body: doctorInput,
      },
    );
  typia.assert(doctor);
  TestValidator.equals("doctor email", doctor.email, doctorEmail);
  TestValidator.equals("doctor NPI", doctor.npi_number, doctorNPI);
  TestValidator.equals(
    "doctor organization admin email matches org admin",
    orgAdminA.email,
    orgAdminAEmail,
  );

  // 3a. Duplicate email error
  await TestValidator.error(
    "duplicate doctor email must fail",
    async () =>
      await api.functional.healthcarePlatform.organizationAdmin.medicaldoctors.create(
        connection,
        {
          body: {
            ...doctorInput,
            npi_number: RandomGenerator.alphaNumeric(10), // change NPI, keep duplicate email
          },
        },
      ),
  );
  // 3b. Duplicate NPI error
  await TestValidator.error(
    "duplicate doctor NPI must fail",
    async () =>
      await api.functional.healthcarePlatform.organizationAdmin.medicaldoctors.create(
        connection,
        {
          body: {
            ...doctorInput,
            email: typia.random<string & tags.Format<"email">>(), // new email, keep duplicate NPI
          },
        },
      ),
  );

  // 4. Register & authenticate OrgB admin
  const orgAdminBEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminB: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminBEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "OrgAdminPassB456!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgAdminB);
  TestValidator.equals(
    "registered orgAdminB email matches input",
    orgAdminB.email,
    orgAdminBEmail,
  );

  // 5. Cross-org duplication should be blocked or scoped (try OrgA doctor in OrgB)
  await TestValidator.error(
    "cross-org duplicate doctor email must fail or be org-isolated",
    async () =>
      await api.functional.healthcarePlatform.organizationAdmin.medicaldoctors.create(
        connection,
        {
          body: {
            ...doctorInput,
            email: doctorEmail, // reuse OrgA doctor email
            npi_number: RandomGenerator.alphaNumeric(10),
          } satisfies IHealthcarePlatformMedicalDoctor.ICreate,
        },
      ),
  );

  await TestValidator.error(
    "cross-org duplicate doctor NPI must fail or be org-isolated",
    async () =>
      await api.functional.healthcarePlatform.organizationAdmin.medicaldoctors.create(
        connection,
        {
          body: {
            ...doctorInput,
            email: typia.random<string & tags.Format<"email">>(),
            npi_number: doctorNPI, // reuse OrgA doctor NPI
          } satisfies IHealthcarePlatformMedicalDoctor.ICreate,
        },
      ),
  );
}
