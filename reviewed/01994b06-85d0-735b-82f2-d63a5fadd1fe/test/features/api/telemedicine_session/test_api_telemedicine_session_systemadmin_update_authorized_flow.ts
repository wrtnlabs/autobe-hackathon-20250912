import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTelemedicineSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSession";

/**
 * Test the authorized update of a telemedicine session by a system admin.
 *
 * 1. Register and authenticate as a system admin user.
 * 2. Create a telemedicine session as system admin to obtain a valid session
 *    ID
 * 3. Perform a valid update (PUT with empty body) as system admin; verify
 *    response is correct and no non-audit fields change.
 * 4. Attempt to update a non-existent session (random UUID) as system admin;
 *    confirm error thrown
 * 5. Attempt to update a real session as unauthenticated user; confirm error
 *    thrown
 *
 * Notes:
 *
 * - Session update DTO has no editable fields at present, so only empty
 *   update is possible.
 * - Attempts to update immutable fields or submit invalid parameters are
 *   unimplementable in this DTO context (skipped)
 * - Focus is on authorization, resource existence, and no-op update
 *   validation.
 */
export async function test_api_telemedicine_session_systemadmin_update_authorized_flow(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a new system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinData = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminJoinData,
    });
  typia.assert(admin);

  // Step 2: Create a telemedicine session as system admin
  const createInput = {
    appointment_id: typia.random<string & tags.Format<"uuid">>(),
    join_link: RandomGenerator.paragraph(),
    session_start: new Date().toISOString(),
    session_end: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    session_recorded: false,
  } satisfies IHealthcarePlatformTelemedicineSession.ICreate;
  const session =
    await api.functional.healthcarePlatform.systemAdmin.telemedicineSessions.create(
      connection,
      { body: createInput },
    );
  typia.assert(session);

  // Step 3: Update the session as system admin with empty update object
  const updated =
    await api.functional.healthcarePlatform.systemAdmin.telemedicineSessions.update(
      connection,
      {
        telemedicineSessionId: session.id,
        body: {}, // IUpdate is empty: no change
      },
    );
  typia.assert(updated);
  // Validate: Non-audit fields remain unchanged
  TestValidator.equals(
    "session ID unchanged after update",
    updated.id,
    session.id,
  );
  TestValidator.equals(
    "appointment ID unchanged after update",
    updated.appointment_id,
    session.appointment_id,
  );
  TestValidator.equals(
    "join link unchanged after update",
    updated.join_link,
    session.join_link,
  );
  TestValidator.equals(
    "session start unchanged",
    updated.session_start,
    session.session_start,
  );
  TestValidator.equals(
    "session end unchanged",
    updated.session_end,
    session.session_end,
  );
  TestValidator.equals(
    "session_recorded unchanged",
    updated.session_recorded,
    session.session_recorded,
  );

  // Step 4: Attempt to update a non-existent session (should error)
  await TestValidator.error(
    "updating nonexistent session must fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.telemedicineSessions.update(
        connection,
        {
          telemedicineSessionId: typia.random<string & tags.Format<"uuid">>(),
          body: {},
        },
      );
    },
  );

  // Step 5: Attempt to update the real session as unauthenticated user (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot update session",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.telemedicineSessions.update(
        unauthConn,
        {
          telemedicineSessionId: session.id,
          body: {},
        },
      );
    },
  );
}
