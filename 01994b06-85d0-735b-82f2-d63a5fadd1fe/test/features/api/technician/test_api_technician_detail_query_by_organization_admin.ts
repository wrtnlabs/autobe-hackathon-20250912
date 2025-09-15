import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Test retrieval of an individual technician profile by organization admin,
 * including proper org boundaries and error handling.
 *
 * 1. Register and login as an org admin
 * 2. Create a technician using the admin session
 * 3. Retrieve the technician via
 *    /healthcarePlatform/organizationAdmin/technicians/{technicianId}
 * 4. Validate all attributes match on created and fetched records
 * 5. Register/login as a different org admin; try to access the same tech (expect
 *    403)
 * 6. Try to fetch a non-existent technicianId (random UUID, expect 404)
 * 7. Optionally (if possible), test soft-deleted technician returns 404
 */
export async function test_api_technician_detail_query_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as an org admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        password: "test1234",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);

  // (token set by SDK)
  // 2. Create a technician
  const techCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(8),
    specialty: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 6,
      wordMax: 12,
    }),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformTechnician.ICreate;
  const technician =
    await api.functional.healthcarePlatform.organizationAdmin.technicians.create(
      connection,
      {
        body: techCreate,
      },
    );
  typia.assert(technician);
  // 3. Retrieve the technician record
  const fetched =
    await api.functional.healthcarePlatform.organizationAdmin.technicians.at(
      connection,
      {
        technicianId: technician.id,
      },
    );
  typia.assert(fetched);
  // All fields should match
  TestValidator.equals(
    "technician fetched matches created",
    fetched.email,
    techCreate.email,
  );
  TestValidator.equals(
    "license number matches",
    fetched.license_number,
    techCreate.license_number,
  );
  TestValidator.equals(
    "specialty matches",
    fetched.specialty,
    techCreate.specialty,
  );
  TestValidator.equals("phone matches", fetched.phone, techCreate.phone);
  TestValidator.equals(
    "full_name matches",
    fetched.full_name,
    techCreate.full_name,
  );

  // 4. Org boundary: Register/login as second org admin
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const secondJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: secondEmail,
        full_name: RandomGenerator.name(),
        password: "admin2345",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(secondJoin);
  // Now admin session is for 2nd org admin
  // Try to access the previous technician (should be forbidden, 403)
  await TestValidator.error(
    "admin from other org forbidden from seeing technician (403)",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.technicians.at(
        connection,
        {
          technicianId: technician.id,
        },
      );
    },
  );

  // 5. Non-existent technicianId
  await TestValidator.error(
    "non-existent technicianId returns 404",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.technicians.at(
        connection,
        {
          technicianId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 6. Soft-delete test is only possible if delete/disable exists; if supported:
  // Skipped as SDK (scenario) gives no delete endpoint here.
}
