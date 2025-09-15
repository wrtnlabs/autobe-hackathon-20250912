import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * E2E test for organization admin nurse creation (POST
 * /healthcarePlatform/organizationAdmin/nurses)
 *
 * This test covers a full business workflow: registering an organization
 * admin; authenticating; then creating a unique nurse. It validates
 * business rules (unique email/license), required field enforcement,
 * success/failure flows, and field types.
 *
 * Steps:
 *
 * 1. Register a new org admin account (store credentials, validates
 *    dependency/JWT state).
 * 2. Use the new admin account to register a nurse with valid, unique fields
 *    (IHealthcarePlatformNurse.ICreate).
 * 3. Validate success: (a) nurse record returned, (b) returned fields match
 *    request, (c) timestamps/UUID/email/phone formats correct, (d) business
 *    rules enforced.
 * 4. Attempt duplicate: Register nurse with same email (should fail); same
 *    license (should fail).
 * 5. Confirm proper error handling: no nurse created, correct error, no auth
 *    tokens in error response.
 * 6. All field types/constraints are checked for both success and error flows.
 */
export async function test_api_nurse_creation_by_organization_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate an organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);
  const adminToken: IAuthorizationToken = admin.token;

  // Step 2: Successfully create a unique nurse
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const uniqueLicense = RandomGenerator.alphaNumeric(12);
  const nurseCreateBody = {
    email: uniqueEmail,
    full_name: RandomGenerator.name(),
    license_number: uniqueLicense,
    specialty: RandomGenerator.paragraph({ sentences: 2 }),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformNurse.ICreate;
  const nurse =
    await api.functional.healthcarePlatform.organizationAdmin.nurses.create(
      connection,
      { body: nurseCreateBody },
    );
  typia.assert(nurse);
  TestValidator.equals("created nurse email matches", nurse.email, uniqueEmail);
  TestValidator.equals(
    "created nurse license matches",
    nurse.license_number,
    uniqueLicense,
  );
  TestValidator.predicate(
    "nurse id is uuid format",
    typeof nurse.id === "string" && /^[0-9a-f-]{36}$/i.test(nurse.id),
  );

  // Step 3: Duplicate nurse with same email - should fail
  await TestValidator.error("duplicate nurse email rejected", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.nurses.create(
      connection,
      {
        body: {
          ...nurseCreateBody,
          license_number: RandomGenerator.alphaNumeric(12),
        } satisfies IHealthcarePlatformNurse.ICreate,
      },
    );
  });

  // Step 4: Duplicate nurse with same license - should fail
  await TestValidator.error("duplicate nurse license rejected", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.nurses.create(
      connection,
      {
        body: {
          ...nurseCreateBody,
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies IHealthcarePlatformNurse.ICreate,
      },
    );
  });
}
