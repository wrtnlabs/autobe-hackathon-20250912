import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Validates receptionist onboarding by organization admin, covering field
 * correctness, uniqueness, negative case, and authentication context.
 *
 * 1. Register and authenticate as organization admin
 *    (/auth/organizationAdmin/join) with unique credentials.
 * 2. Prepare receptionist creation request with unique business email, full name,
 *    and optional phone.
 * 3. Call receptionist creation endpoint
 *    (/healthcarePlatform/organizationAdmin/receptionists) and verify response
 *    fields match input and DTO requirements.
 * 4. Assert correct type (typia), business logic (fields match input), and
 *    business rules (e.g., soft deletion is null, ISO date format on
 *    timestamps).
 * 5. Attempt duplicate receptionist creation to verify uniqueness check triggers
 *    expected error.
 * 6. Validate JWT tokens were issued on admin join.
 */
export async function test_api_receptionist_creation_success(
  connection: api.IConnection,
) {
  // 1. Register & authenticate as healthcare organization admin
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "test-password",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;

  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminJoin,
    });
  typia.assert(admin);
  TestValidator.equals(
    "admin email matches input",
    admin.email,
    adminJoin.email,
  );
  TestValidator.equals(
    "admin full name matches input",
    admin.full_name,
    adminJoin.full_name,
  );
  TestValidator.equals(
    "admin phone matches input",
    admin.phone,
    adminJoin.phone,
  );
  TestValidator.predicate(
    "admin id is uuid",
    typeof admin.id === "string" && admin.id.length > 0,
  );
  TestValidator.predicate(
    "admin token structure",
    typeof admin.token === "object" &&
      typeof admin.token.access === "string" &&
      typeof admin.token.refresh === "string",
  );

  // 2. Prepare unique receptionist input
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistReq = {
    email: receptionistEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;

  // 3. Call create receptionist API
  const receptionist: IHealthcarePlatformReceptionist =
    await api.functional.healthcarePlatform.organizationAdmin.receptionists.create(
      connection,
      { body: receptionistReq },
    );
  typia.assert(receptionist);
  TestValidator.equals(
    "receptionist email matches input",
    receptionist.email,
    receptionistReq.email,
  );
  TestValidator.equals(
    "receptionist full name matches input",
    receptionist.full_name,
    receptionistReq.full_name,
  );
  TestValidator.equals(
    "receptionist phone matches input",
    receptionist.phone,
    receptionistReq.phone,
  );
  TestValidator.predicate(
    "receptionist id is uuid",
    typeof receptionist.id === "string" && receptionist.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO date",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(receptionist.created_at),
  );
  TestValidator.equals(
    "deleted_at is null on creation",
    receptionist.deleted_at,
    null,
  );

  // 4. Attempt to create receptionist with duplicate email, expect failure
  await TestValidator.error(
    "duplicate receptionist email rejected",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.receptionists.create(
        connection,
        { body: receptionistReq },
      );
    },
  );
}
