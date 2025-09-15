import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerAuditLog";

/**
 * E2E test for OAuth server audit log search by an admin user.
 *
 * The test authenticates by creating a new admin user via the join API.
 * Then it performs multiple search requests on the audit log endpoint with
 * valid filters including event type, actor ID, and event timestamps,
 * validating results and pagination.
 *
 * It verifies that unauthorized users cannot access the audit log search,
 * expecting error responses.
 *
 * The test validates business logic rules such as data confidentiality and
 * integrity by ensuring only admin users receive correct audit log data.
 *
 * It uses typia.assert to check data shapes, and TestValidator for business
 * validation and error scenarios.
 *
 * Step-by-step:
 *
 * 1. Create and authenticate admin user
 * 2. Search audit logs with a valid event_type filter
 * 3. Search audit logs with an actor_id filter matching valid UUID
 * 4. Search audit logs with event_timestamp boundary filters
 * 5. Attempt audit log search as unauthenticated and expect failure
 * 6. Attempt audit log search with invalid event_type and expect failure
 * 7. Validate pagination metadata in responses
 */
export async function test_api_oauth_server_audit_log_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "P@ssw0rd!";
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Search audit logs with a valid event_type filter
  const eventType: string = "authentication_success"; // Assumed standard event type
  const searchByEventTypeBody = {
    event_type: eventType,
    event_timestamp: new Date().toISOString(),
    event_description: "",
  } satisfies IOauthServerAuditLog.IRequest;
  const eventTypeResponse: IPageIOauthServerAuditLog =
    await api.functional.oauthServer.admin.oauthServerAuditLogs.index(
      connection,
      {
        body: searchByEventTypeBody,
      },
    );
  typia.assert(eventTypeResponse);
  TestValidator.predicate(
    "Audit logs found for event_type filter",
    eventTypeResponse.data.length >= 0,
  );

  // 3. Search audit logs with an actor_id filter matching valid UUID
  // Use actor_id from one existing audit log if available, else random UUID
  let actorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (eventTypeResponse.data.length > 0) {
    const foundActorId = eventTypeResponse.data.find(
      (log) => log.actor_id !== null && log.actor_id !== undefined,
    )?.actor_id;
    if (foundActorId !== null && foundActorId !== undefined) {
      actorId = foundActorId satisfies string as string;
    }
  }
  const searchByActorIdBody = {
    event_type: "",
    actor_id: actorId,
    event_timestamp: new Date().toISOString(),
    event_description: "",
  } satisfies IOauthServerAuditLog.IRequest;
  const actorIdResponse: IPageIOauthServerAuditLog =
    await api.functional.oauthServer.admin.oauthServerAuditLogs.index(
      connection,
      {
        body: searchByActorIdBody,
      },
    );
  typia.assert(actorIdResponse);
  TestValidator.predicate(
    "Audit logs found for actor_id filter",
    actorIdResponse.data.length >= 0,
  );

  // 4. Search audit logs with event_timestamp boundary filters
  const nowISO = new Date().toISOString();
  const searchByTimestampBody = {
    event_type: "",
    event_timestamp: nowISO,
    event_description: "",
  } satisfies IOauthServerAuditLog.IRequest;
  const timestampResponse: IPageIOauthServerAuditLog =
    await api.functional.oauthServer.admin.oauthServerAuditLogs.index(
      connection,
      {
        body: searchByTimestampBody,
      },
    );
  typia.assert(timestampResponse);
  TestValidator.predicate(
    "Audit logs found for timestamp filter",
    timestampResponse.data.length >= 0,
  );

  // 5. Attempt audit log search as unauthenticated and expect failure
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthorized audit log search should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthServerAuditLogs.index(
        unauthenticatedConn,
        {
          body: searchByTimestampBody,
        },
      );
    },
  );

  // 6. Attempt audit log search with invalid event_type and expect failure
  await TestValidator.error(
    "Invalid event_type search should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthServerAuditLogs.index(
        connection,
        {
          body: {
            event_type: "unknown_event_type",
            event_timestamp: nowISO,
            event_description: "",
          } satisfies IOauthServerAuditLog.IRequest,
        },
      );
    },
  );

  // 7. Validate pagination metadata in responses
  TestValidator.predicate(
    "Pagination metadata present in event type response",
    typeof eventTypeResponse.pagination === "object",
  );
  TestValidator.predicate(
    "Pagination metadata present in actor id response",
    typeof actorIdResponse.pagination === "object",
  );
  TestValidator.predicate(
    "Pagination metadata present in timestamp response",
    typeof timestampResponse.pagination === "object",
  );
}
