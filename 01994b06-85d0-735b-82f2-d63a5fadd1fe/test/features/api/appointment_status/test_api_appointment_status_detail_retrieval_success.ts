import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentStatus";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate successful appointment status details retrieval and relevant error
 * cases as organization admin.
 *
 * - Register a new organization admin
 * - Log in as organization admin
 * - Create new appointment status
 * - Retrieve the status via GET by id
 * - Assert full detail DTO equality and required fields
 * - Try retrieval with a random (invalid) status id and assert error
 * - Try retrieval without authentication and assert error
 */
export async function test_api_appointment_status_detail_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: adminJoinInput },
  );
  typia.assert(adminAuth);

  // 2. Log in (explicit, to check session switching)
  const adminLoginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const adminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: adminLoginInput },
  );
  typia.assert(adminLogin);
  TestValidator.equals(
    "login returns same admin id",
    adminLogin.id,
    adminAuth.id,
  );

  // 3. Create new appointment status
  const statusInput = {
    status_code: RandomGenerator.alphabets(10),
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    business_status: RandomGenerator.pick(["active", "closed", null]),
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IHealthcarePlatformAppointmentStatus.ICreate;
  const createdStatus =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      connection,
      { body: statusInput },
    );
  typia.assert(createdStatus);
  TestValidator.equals(
    "created status_code matches input",
    createdStatus.status_code,
    statusInput.status_code,
  );

  // 4. Retrieve appointment status by id
  const fetched =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.at(
      connection,
      { statusId: createdStatus.id },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "retrieved appointment status matches created",
    fetched,
    createdStatus,
  );

  // 5. Negative - try to retrieve with invalid random statusId
  await TestValidator.error(
    "retrieving with invalid statusId throws",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.at(
        connection,
        {
          statusId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Negative - try retrieval without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "retrieving without authentication throws",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.at(
        unauthConn,
        { statusId: createdStatus.id },
      );
    },
  );
}
