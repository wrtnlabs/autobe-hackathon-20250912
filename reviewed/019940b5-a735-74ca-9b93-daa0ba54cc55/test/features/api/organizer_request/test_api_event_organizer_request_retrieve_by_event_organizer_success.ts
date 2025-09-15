import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import type { IEventRegistrationOrganizerRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationOrganizerRequest";
import type { IEventRegistrationOrganizerRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationOrganizerRequests";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * This test verifies that an event organizer user can successfully retrieve
 * a specific event organizer request's detailed information by its unique
 * ID. This scenario involves the entire flow of registering an event
 * organizer, registering a regular user, submitting an organizer request by
 * the regular user, signing in as the event organizer, and retrieving the
 * organizer request.
 *
 * The test will validate that the returned organizer request has all
 * required fields with correct formats and values consistent with the
 * submitted request.
 *
 * Steps:
 *
 * 1. Register an event organizer user and authenticate.
 * 2. Register a regular user and authenticate.
 * 3. Regular user submits an organizer request with realistic data.
 * 4. Event organizer signs in to authenticate as event organizer.
 * 5. Event organizer retrieves the previously submitted organizer request by
 *    ID.
 * 6. Validate the retrieved organizer request matches the created one
 *    excluding timing fields that could differ.
 */
export async function test_api_event_organizer_request_retrieve_by_event_organizer_success(
  connection: api.IConnection,
) {
  // 1. Register event organizer user
  const eventOrganizerEmail = typia.random<string & tags.Format<"email">>();
  const eventOrganizerPassword = "Password123!";
  const eventOrganizerName = RandomGenerator.name();
  const eventOrganizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: {
        email: eventOrganizerEmail,
        password_hash: eventOrganizerPassword,
        full_name: eventOrganizerName,
        phone_number: null,
        profile_picture_url: null,
        email_verified: false,
      } satisfies IEventRegistrationEventOrganizer.ICreate,
    });
  typia.assert(eventOrganizer);

  // 2. Register regular user
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUserPassword = "Password123!";
  const regularUserFullName = RandomGenerator.name();
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPassword,
        full_name: regularUserFullName,
        phone_number: null,
        profile_picture_url: null,
        email_verified: false,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // 3. Regular user submits an organizer request
  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: regularUserEmail,
      password_hash: regularUserPassword,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });
  const organizerRequestReason = RandomGenerator.paragraph({ sentences: 3 });
  const organizerRequest: IEventRegistrationOrganizerRequest =
    await api.functional.eventRegistration.regularUser.organizerRequests.createOrganizerRequest(
      connection,
      {
        body: {
          user_id: regularUser.id,
          status: "pending",
          reason: organizerRequestReason,
          admin_comment: null,
        } satisfies IEventRegistrationOrganizerRequest.ICreate,
      },
    );
  typia.assert(organizerRequest);

  // 4. Switch authentication to event organizer
  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: eventOrganizerEmail,
      password_hash: eventOrganizerPassword,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  // 5. Retrieve organizer request details by event organizer
  const retrievedRequest: IEventRegistrationOrganizerRequests =
    await api.functional.eventRegistration.eventOrganizer.organizerRequests.atOrganizerRequest(
      connection,
      {
        organizerRequestId: organizerRequest.id,
      },
    );
  typia.assert(retrievedRequest);

  // 6. Validate retrieved organizer request
  TestValidator.equals(
    "organizer request ID matches",
    retrievedRequest.id,
    organizerRequest.id,
  );
  TestValidator.equals(
    "organizer request user ID matches",
    retrievedRequest.user_id,
    organizerRequest.user_id,
  );
  TestValidator.equals(
    "organizer request status matches",
    retrievedRequest.status,
    organizerRequest.status,
  );
  TestValidator.equals(
    "organizer request reason matches",
    retrievedRequest.reason,
    organizerRequest.reason,
  );
  TestValidator.equals(
    "organizer request admin comment matches",
    retrievedRequest.admin_comment,
    organizerRequest.admin_comment,
  );
  TestValidator.predicate(
    "organizer request created_at is valid date-time",
    typeof retrievedRequest.created_at === "string",
  );
  TestValidator.predicate(
    "organizer request updated_at is valid date-time",
    typeof retrievedRequest.updated_at === "string",
  );
}
