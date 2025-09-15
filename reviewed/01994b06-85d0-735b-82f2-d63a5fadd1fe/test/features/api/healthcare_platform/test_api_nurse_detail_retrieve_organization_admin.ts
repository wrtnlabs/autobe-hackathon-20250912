import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate that an organization admin can retrieve nurse profile details by
 * nurseId, enforce data isolation, and handle not-found errors.
 *
 * Business context:
 *
 * - The admin must be able to view all legitimate nurse fields (id, email, name,
 *   license_number, etc).
 * - Data isolation must prevent admins from viewing other organizations' nurses.
 * - 404 or permission denied must be returned for non-existent or unauthorized
 *   nurseId.
 *
 * Test steps:
 *
 * 1. Onboard and authenticate as organization admin A.
 * 2. Create a nurse profile under admin A's organization.
 * 3. Retrieve nurse profile detail with admin A, validate all schema fields and
 *    value correctness.
 * 4. Onboard and authenticate as organization admin B (different organization).
 * 5. Attempt to retrieve the nurse created by admin A with admin B (expect
 *    error/data isolation).
 * 6. Attempt to retrieve a non-existent nurseId and expect not found error.
 */
export async function test_api_nurse_detail_retrieve_organization_admin(
  connection: api.IConnection,
) {
  // 1. Onboard and authenticate as organization admin A
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminAName = RandomGenerator.name();
  const adminA = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: adminAEmail,
      full_name: adminAName,
      password: "Test!1234",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(adminA);
  TestValidator.equals("adminA email matches", adminA.email, adminAEmail);
  TestValidator.equals(
    "adminA full_name matches",
    adminA.full_name,
    adminAName,
  );

  // 2. Create nurse profile under admin A's organization
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nurseFullName = RandomGenerator.name();
  const nurseLicense = RandomGenerator.alphaNumeric(10);
  const nurseSpecialty = RandomGenerator.paragraph({ sentences: 1 });
  const createNurseBody = {
    email: nurseEmail,
    full_name: nurseFullName,
    license_number: nurseLicense,
    specialty: nurseSpecialty,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformNurse.ICreate;
  const nurse =
    await api.functional.healthcarePlatform.organizationAdmin.nurses.create(
      connection,
      {
        body: createNurseBody,
      },
    );
  typia.assert(nurse);
  TestValidator.equals("created nurse email matches", nurse.email, nurseEmail);
  TestValidator.equals(
    "created nurse full_name matches",
    nurse.full_name,
    nurseFullName,
  );
  TestValidator.equals(
    "created nurse license_number matches",
    nurse.license_number,
    nurseLicense,
  );
  TestValidator.equals(
    "created nurse specialty matches",
    nurse.specialty,
    nurseSpecialty,
  );
  TestValidator.equals(
    "created nurse phone matches",
    nurse.phone,
    createNurseBody.phone,
  );

  // 3. Retrieve nurse profile using admin A, ensure all fields match
  const retrieved =
    await api.functional.healthcarePlatform.organizationAdmin.nurses.at(
      connection,
      {
        nurseId: nurse.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved nurse matches creation",
    retrieved,
    nurse,
    (key) => key === "created_at" || key === "updated_at",
  );

  // 4. Onboard and authenticate as a different organization admin (admin B)
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminB = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: adminBEmail,
      full_name: RandomGenerator.name(),
      password: "Test!5678",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(adminB);

  // 5. Attempt to retrieve nurseId from another organization (should fail -- forbidden or not found)
  await TestValidator.error(
    "organization admin B cannot access nurse from admin A's org",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.nurses.at(
        connection,
        {
          nurseId: nurse.id,
        },
      );
    },
  );

  // 6. Attempt to retrieve a non-existent nurseId (should fail)
  const randomNurseId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving non-existent nurseId fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.nurses.at(
        connection,
        {
          nurseId: randomNurseId,
        },
      );
    },
  );
}
