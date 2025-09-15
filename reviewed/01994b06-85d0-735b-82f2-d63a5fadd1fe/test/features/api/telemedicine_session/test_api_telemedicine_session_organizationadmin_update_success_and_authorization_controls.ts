import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformTelemedicineSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSession";

/**
 * Validate organization admin can successfully update a telemedicine
 * session and that proper authorization controls exist.
 *
 * 1. Register and authenticate a new organization admin.
 * 2. Create a telemedicine session using a valid appointment_id, join link,
 *    dates, and session_recorded flag.
 * 3. Update the telemedicine session as the admin—validate update succeeds and
 *    updated_at field changes.
 * 4. Negative scenario: Attempt to update session using an invalid
 *    telemedicineSessionId—expect error.
 * 5. Negative scenario: Attempt update without authentication—expect
 *    authorization error.
 */
export async function test_api_telemedicine_session_organizationadmin_update_success_and_authorization_controls(
  connection: api.IConnection,
) {
  // 1. Register and authenticate organization admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;

  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(admin);

  // 2. Create a telemedicine session
  const createSessionInput = {
    appointment_id: typia.random<string & tags.Format<"uuid">>(),
    join_link: RandomGenerator.alphaNumeric(20),
    session_start: new Date(Date.now() + 60_000).toISOString(),
    session_end: new Date(Date.now() + 3_600_000).toISOString(),
    session_recorded: false,
  } satisfies IHealthcarePlatformTelemedicineSession.ICreate;

  const session =
    await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.create(
      connection,
      { body: createSessionInput },
    );
  typia.assert(session);
  TestValidator.equals(
    "created appointment_id matches input",
    session.appointment_id,
    createSessionInput.appointment_id,
  );

  // 3. Update as admin - should succeed and update audit timestamps
  const beforeUpdateAt = session.updated_at;
  await new Promise((resolve) => setTimeout(resolve, 5)); // ensure updated_at changes
  const updatedSession =
    await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.update(
      connection,
      { telemedicineSessionId: session.id, body: {} },
    );
  typia.assert(updatedSession);
  TestValidator.notEquals(
    "updated_at must change after update",
    updatedSession.updated_at,
    beforeUpdateAt,
  );
  // Nonce-assert core properties remain constant
  TestValidator.equals(
    "session id must remain same after update",
    updatedSession.id,
    session.id,
  );
  TestValidator.equals(
    "appointment_id remains the same",
    updatedSession.appointment_id,
    createSessionInput.appointment_id,
  );

  // 4. Negative: invalid telemedicineSessionId
  await TestValidator.error(
    "updating non-existent session should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.update(
        connection,
        {
          telemedicineSessionId: typia.random<string & tags.Format<"uuid">>(), // random UUID should not exist
          body: {},
        },
      );
    },
  );

  // 5. Negative: unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("update fails without authentication", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.update(
      unauthConn,
      {
        telemedicineSessionId: session.id,
        body: {},
      },
    );
  });
}
