import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentStatus";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validates appointment status creation as organization admin including edge
 * cases for duplicates and validation errors.
 *
 * Steps:
 *
 * 1. Register and login as organization admin (OrgA)
 * 2. Create valid appointment status (statusA) and verify response
 * 3. Attempt to create duplicate status_code in same org → expect error
 * 4. Attempt to create with negative sort_order → expect error
 * 5. Register/login as another organization admin (OrgB)
 * 6. Create appointment status with same status_code in different org → expect
 *    success
 * 7. Attempt to create status without authentication → expect error
 */
export async function test_api_appointment_status_creation_validation(
  connection: api.IConnection,
) {
  // 1. Register OrgA admin
  const orgA_email = typia.random<string & tags.Format<"email">>();
  const orgA_full_name = RandomGenerator.name();
  const orgA_password = RandomGenerator.alphaNumeric(10);
  const orgA_admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgA_email,
        full_name: orgA_full_name,
        password: orgA_password,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgA_admin);
  const orgA_token = orgA_admin.token.access;

  // 2. Login to get/refresh Authorization context (if required)
  const orgA_login: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: orgA_email,
        password: orgA_password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    });
  typia.assert(orgA_login);

  // 3. Create valid appointment status (statusA)
  const status_code = RandomGenerator.alphaNumeric(8);
  const createStatusBody = {
    status_code,
    display_name: RandomGenerator.name(2),
    business_status: RandomGenerator.pick([
      "active",
      "closed",
      "in-progress",
      null,
    ]),
    sort_order: 1,
  } satisfies IHealthcarePlatformAppointmentStatus.ICreate;
  const statusA: IHealthcarePlatformAppointmentStatus =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      connection,
      {
        body: createStatusBody,
      },
    );
  typia.assert(statusA);
  TestValidator.equals(
    "status_code matches input",
    statusA.status_code,
    status_code,
  );
  TestValidator.equals(
    "display_name matches input",
    statusA.display_name,
    createStatusBody.display_name,
  );
  TestValidator.equals(
    "business_status matches input (could be null)",
    statusA.business_status ?? null,
    createStatusBody.business_status ?? null,
  );
  TestValidator.equals(
    "sort_order matches input",
    statusA.sort_order,
    createStatusBody.sort_order,
  );

  // 4. Duplicate status_code in same org
  const duplicateBody = {
    status_code,
    display_name: RandomGenerator.name(2),
    business_status: RandomGenerator.pick([
      "active",
      "closed",
      "in-progress",
      null,
    ]),
    sort_order: 3,
  } satisfies IHealthcarePlatformAppointmentStatus.ICreate;
  await TestValidator.error(
    "should fail on duplicate status_code in same org",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
        connection,
        {
          body: duplicateBody,
        },
      );
    },
  );

  // 5. Negative sort_order
  const negativeSortBody = {
    status_code: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(2),
    business_status: "active",
    sort_order: -1,
  } satisfies IHealthcarePlatformAppointmentStatus.ICreate;
  await TestValidator.error("should fail on negative sort_order", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      connection,
      {
        body: negativeSortBody,
      },
    );
  });

  // 6. Register and login as a different org admin (OrgB)
  const orgB_email = typia.random<string & tags.Format<"email">>();
  const orgB_full_name = RandomGenerator.name();
  const orgB_password = RandomGenerator.alphaNumeric(12);
  const orgB_admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgB_email,
        full_name: orgB_full_name,
        password: orgB_password,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgB_admin);
  const orgB_login: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: orgB_email,
        password: orgB_password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    });
  typia.assert(orgB_login);

  // 7. Create new status with same status_code (should succeed in different org)
  const statusB_body = {
    status_code, // reusing the same code
    display_name: RandomGenerator.name(2),
    business_status: RandomGenerator.pick(["closed", "active", null]),
    sort_order: 7,
  } satisfies IHealthcarePlatformAppointmentStatus.ICreate;
  const statusB =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      connection,
      {
        body: statusB_body,
      },
    );
  typia.assert(statusB);
  TestValidator.equals(
    "status_code is allowed in a different org",
    statusB.status_code,
    status_code,
  );

  // 8. Attempt creation without authentication (simulate unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const unauthBody = {
    status_code: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(2),
    business_status: "active",
    sort_order: 10,
  } satisfies IHealthcarePlatformAppointmentStatus.ICreate;
  await TestValidator.error("should fail if not authenticated", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      unauthConn,
      {
        body: unauthBody,
      },
    );
  });
}
