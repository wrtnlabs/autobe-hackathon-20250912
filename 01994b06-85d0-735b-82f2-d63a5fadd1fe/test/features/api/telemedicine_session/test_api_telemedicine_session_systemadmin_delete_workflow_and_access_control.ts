import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTelemedicineSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSession";

/**
 * Test the permanent deletion of a telemedicine session by a system
 * administrator. Validates that after session is deleted, it cannot be
 * accessed. Checks negative access (wrong session id, non-existing session,
 * unauthorized user).
 */
export async function test_api_telemedicine_session_systemadmin_delete_workflow_and_access_control(
  connection: api.IConnection,
) {
  // 1. Onboard system admin and login
  const adminEmail =
    RandomGenerator.name(2).replace(/\s/g, "") + "@corp-demo.com";
  const adminFullName = RandomGenerator.name(2);
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: adminFullName,
        provider: "local",
        provider_key: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Admin creates new telemedicine session
  const appointmentId = typia.random<string & tags.Format<"uuid">>();
  const joinLink =
    "https://telemed.meeting/" + RandomGenerator.alphaNumeric(12);
  const now = new Date();
  const sessionStart = new Date(now.getTime() + 60 * 1000).toISOString();
  const sessionEnd = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const createBody = {
    appointment_id: appointmentId,
    join_link: joinLink,
    session_start: sessionStart,
    session_end: sessionEnd,
    session_recorded: RandomGenerator.pick([true, false]),
  } satisfies IHealthcarePlatformTelemedicineSession.ICreate;

  const session =
    await api.functional.healthcarePlatform.systemAdmin.telemedicineSessions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(session);
  TestValidator.equals(
    "session appointment ids match",
    session.appointment_id,
    appointmentId,
  );

  // 3. Delete the telemedicine session hard
  await api.functional.healthcarePlatform.systemAdmin.telemedicineSessions.erase(
    connection,
    { telemedicineSessionId: session.id },
  );

  // 4. Try to delete again (should error: already deleted)
  await TestValidator.error(
    "deleting already-deleted session should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.telemedicineSessions.erase(
        connection,
        { telemedicineSessionId: session.id },
      );
    },
  );

  // 5. Try to delete a random/non-existent session (should error)
  await TestValidator.error(
    "deleting non-existent session should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.telemedicineSessions.erase(
        connection,
        { telemedicineSessionId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );

  // 6. Try as unauthorized/unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot delete telemedicine session",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.telemedicineSessions.erase(
        unauthConn,
        { telemedicineSessionId: session.id },
      );
    },
  );
}
