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
 * System admin token session audit and filtering e2e validation.
 *
 * 1. Register admin and verify authenticated context.
 * 2. Retrieve all token sessions with no filter, assert own session present.
 * 3. Filter by system_admin_id (self), expect to find only own sessions.
 * 4. Filter by a random authenticated_user_id (no match), expect empty data.
 * 5. Test pagination: set limit=1, page=1, ensure result structure.
 * 6. For each session, confirm sensitive values such as raw tokens are not
 *    present.
 * 7. Test unauthorized access: try endpoint with unauthenticated connection,
 *    expect error.
 * 8. Test invalid input: page=0, expect error.
 */
export async function test_api_token_session_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin and validate authentication context
  const joinInput = {
    external_admin_id: RandomGenerator.alphaNumeric(16),
    email: `${RandomGenerator.alphabets(8)}@company.com`,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const admin: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: joinInput });
  typia.assert(admin);
  TestValidator.equals(
    "systemAdmin email matches join input",
    admin.email,
    joinInput.email,
  );
  TestValidator.equals(
    "actor_type is always 'systemAdmin'",
    admin.actor_type,
    "systemAdmin",
  );
  TestValidator.predicate(
    "token.access exists",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );

  // 2. Retrieve all token sessions (no filter)
  const allSessions =
    await api.functional.storyfieldAi.systemAdmin.tokenSessions.index(
      connection,
      { body: {} satisfies IStoryfieldAiTokenSession.IRequest },
    );
  typia.assert(allSessions);
  TestValidator.predicate(
    "pagination object exists",
    typeof allSessions.pagination === "object",
  );
  TestValidator.predicate(
    "sessions returned as array",
    Array.isArray(allSessions.data),
  );
  // Confirm that this admin's session exists
  const foundOwnSession = allSessions.data.find(
    (session) => session.system_admin_id === admin.id,
  );
  TestValidator.predicate(
    "own admin session present in sessions",
    typeof foundOwnSession !== "undefined",
  );
  // Confirm no raw tokens in session summary objects
  if (allSessions.data[0]) {
    TestValidator.predicate(
      "session summary does not contain token/access fields",
      !("token" in allSessions.data[0]) && !("access" in allSessions.data[0]),
    );
  }

  // 3. Filter by own system_admin_id
  const filterByAdmin =
    await api.functional.storyfieldAi.systemAdmin.tokenSessions.index(
      connection,
      {
        body: {
          system_admin_id: admin.id,
        } satisfies IStoryfieldAiTokenSession.IRequest,
      },
    );
  typia.assert(filterByAdmin);
  TestValidator.predicate(
    "sessions only for system_admin_id",
    filterByAdmin.data.every((s) => s.system_admin_id === admin.id),
  );

  // 4. Filter by random non-existent authenticated_user_id
  const noUserResult =
    await api.functional.storyfieldAi.systemAdmin.tokenSessions.index(
      connection,
      {
        body: {
          authenticated_user_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IStoryfieldAiTokenSession.IRequest,
      },
    );
  typia.assert(noUserResult);
  TestValidator.equals(
    "search for non-existent user session returns empty",
    noUserResult.data.length,
    0,
  );

  // 5. Pagination test (page/limit) - limit=1, page=1 (assuming at least 1 session exists)
  const paged =
    await api.functional.storyfieldAi.systemAdmin.tokenSessions.index(
      connection,
      {
        body: {
          page: 1 satisfies number,
          limit: 1 satisfies number,
        } satisfies IStoryfieldAiTokenSession.IRequest,
      },
    );
  typia.assert(paged);
  TestValidator.equals("pagination.current is 1", paged.pagination.current, 1);
  TestValidator.equals("pagination.limit is 1", paged.pagination.limit, 1);
  TestValidator.predicate("paged.data.length <= 1", paged.data.length <= 1);

  // 6. Attempt with unauthenticated connection: expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated systemAdmin should not access tokenSessions",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.tokenSessions.index(
        unauthConn,
        { body: {} satisfies IStoryfieldAiTokenSession.IRequest },
      );
    },
  );

  // 7. Invalid query parameter - page=0 (out of allowed range), expect error
  await TestValidator.error(
    "invalid page parameter should cause error",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.tokenSessions.index(
        connection,
        {
          body: {
            page: 0 satisfies number,
          } satisfies IStoryfieldAiTokenSession.IRequest,
        },
      );
    },
  );

  // 8. Optionally, if there is at least one session record, test filtering by fingerprint/issued_at using a record from current data
  const sessionSample = allSessions.data[0];
  if (sessionSample) {
    const filterByFingerprint =
      await api.functional.storyfieldAi.systemAdmin.tokenSessions.index(
        connection,
        {
          body: {
            fingerprint: sessionSample.fingerprint,
          } satisfies IStoryfieldAiTokenSession.IRequest,
        },
      );
    typia.assert(filterByFingerprint);
    TestValidator.predicate(
      "filtered by fingerprint should include only matching session(s)",
      filterByFingerprint.data.every(
        (s) => s.fingerprint === sessionSample.fingerprint,
      ),
    );
  }
}
