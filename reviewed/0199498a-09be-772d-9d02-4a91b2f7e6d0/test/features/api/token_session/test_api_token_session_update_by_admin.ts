import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIStoryfieldAiTokenSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiTokenSession";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";
import type { IStoryfieldAiTokenSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTokenSession";

/**
 * Validate admin update of a token session's allowed fields.
 *
 * 1. Register and log in as a new system admin. Save credentials.
 * 2. List token sessions as admin; pick an admin-linked session.
 * 3. Prepare a valid update payload (e.g., change `expires_at`, and/or
 *    `fingerprint`).
 * 4. Call update endpoint, passing the session ID and update payload.
 * 5. Fetch session list again and validate that the updates are reflected for the
 *    same ID.
 * 6. Try to update a non-existent session expecting an error.
 */
export async function test_api_token_session_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and log in as system admin
  const externalAdminId = RandomGenerator.alphaNumeric(16);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@testing-admin.com`;
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      external_admin_id: externalAdminId,
      email: adminEmail,
      actor_type: "systemAdmin",
    } satisfies IStoryfieldAiSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. List token sessions, filter for this admin's sessions
  const sessionPage =
    await api.functional.storyfieldAi.systemAdmin.tokenSessions.index(
      connection,
      {
        body: {
          system_admin_id: adminJoin.id,
          limit: 5,
        } satisfies IStoryfieldAiTokenSession.IRequest,
      },
    );
  typia.assert(sessionPage);
  TestValidator.predicate(
    "at least one admin session exists",
    sessionPage.data.length > 0,
  );
  const sessionToUpdate = sessionPage.data[0];
  typia.assert(sessionToUpdate);

  // 3. Prepare update payload (update expires_at & fingerprint)
  const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const newFingerprint = RandomGenerator.alphaNumeric(32);
  const updatePayload = {
    expires_at: newExpiresAt,
    fingerprint: newFingerprint,
  } satisfies IStoryfieldAiTokenSession.IUpdate;

  // 4. Update the session
  const updatedSession =
    await api.functional.storyfieldAi.systemAdmin.tokenSessions.update(
      connection,
      {
        tokenSessionId: sessionToUpdate.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedSession);
  TestValidator.equals(
    "expires_at updated",
    updatedSession.expires_at,
    newExpiresAt,
  );
  TestValidator.equals(
    "fingerprint updated",
    updatedSession.fingerprint,
    newFingerprint,
  );

  // 5. Re-list to confirm persistence
  const newSessionPage =
    await api.functional.storyfieldAi.systemAdmin.tokenSessions.index(
      connection,
      {
        body: {
          system_admin_id: adminJoin.id,
          limit: 5,
        } satisfies IStoryfieldAiTokenSession.IRequest,
      },
    );
  typia.assert(newSessionPage);
  const found = newSessionPage.data.find((s) => s.id === sessionToUpdate.id);
  typia.assertGuard(found!);
  TestValidator.equals(
    "reloaded expires_at matches",
    found!.expires_at,
    newExpiresAt,
  );
  TestValidator.equals(
    "reloaded fingerprint matches",
    found!.fingerprint,
    newFingerprint,
  );

  // 6. Error case: update a non-existent session (expect error)
  await TestValidator.error(
    "update non-existent session should fail",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.tokenSessions.update(
        connection,
        {
          tokenSessionId: typia.random<string & tags.Format<"uuid">>(),
          body: updatePayload,
        },
      );
    },
  );
}
