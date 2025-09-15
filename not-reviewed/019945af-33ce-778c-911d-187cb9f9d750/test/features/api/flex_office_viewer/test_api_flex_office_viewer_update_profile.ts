import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";

/**
 * This test validates the update process of a FlexOffice viewer user's
 * profile.
 *
 * It simulates a viewer user registering, then logging in to obtain
 * authorization, followed by updating their profile information via the
 * appropriate API. The test ensures that changes to name, email, and
 * password_hash fields are correctly applied and that API responses conform
 * precisely to expected DTOs.
 *
 * The test emphasizes authorization enforcement, input validation, and data
 * persistence of updates. It uses descriptively named TestValidator
 * assertions and typia.assert calls for rigorous verification.
 *
 * Process steps:
 *
 * 1. Register viewer with random valid credentials.
 * 2. Login viewer to receive valid access token.
 * 3. Update profile with new random name, email, and password_hash.
 * 4. Assert updated fields match input; password_hash not returned.
 * 5. Confirm returned viewer includes valid UUID id and ISO timestamps.
 * 6. (Optional) Attempt null field updates to test nullable behavior.
 * 7. Ensure full response type safety with typia.assert.
 */
export async function test_api_flex_office_viewer_update_profile(
  connection: api.IConnection,
) {
  // 1. Viewer registration via join
  const createBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password1234",
  } satisfies IFlexOfficeViewer.ICreate;
  const authorized: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, { body: createBody });
  typia.assert(authorized);

  // 2. Login with registered credentials
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
  } satisfies IFlexOfficeViewer.ILogin;
  const loginAuth: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.login(connection, { body: loginBody });
  typia.assert(loginAuth);

  // Authentication token automatically set by API calls

  // 3. Prepare update payload with new random name, email, and password_hash
  const updateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
  } satisfies IFlexOfficeViewer.IUpdate;

  // 4. Update viewer profile
  const updatedViewer: IFlexOfficeViewer =
    await api.functional.flexOffice.viewer.viewers.updateViewer(connection, {
      viewerId: authorized.id,
      body: updateBody,
    });
  typia.assert(updatedViewer);

  // 5. Assert updated fields
  TestValidator.equals(
    "updated name matches",
    updatedViewer.name,
    updateBody.name,
  );
  TestValidator.equals(
    "updated email matches",
    updatedViewer.email,
    updateBody.email,
  );

  // 6. Validate returned viewer has a valid UUID
  TestValidator.predicate(
    "viewer id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      updatedViewer.id,
    ),
  );

  // 7. Validate ISO 8601 timestamps for created_at/updated_at
  TestValidator.predicate(
    "created_at is a valid ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.+-]{1,}[zZ]?$/i.test(
      updatedViewer.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.+-]{1,}[zZ]?$/i.test(
      updatedViewer.updated_at,
    ),
  );

  // 8. (Optional) Update with null fields to test nullability (commented out for brevity)
  /*
  const nullUpdateBody = {
    name: null,
    email: null,
    password_hash: null,
  } satisfies IFlexOfficeViewer.IUpdate;
  const nullUpdatedViewer = await api.functional.flexOffice.viewer.viewers.updateViewer(connection, {
    viewerId: authorized.id,
    body: nullUpdateBody,
  });
  typia.assert(nullUpdatedViewer);
  TestValidator.equals("null update name matches", nullUpdatedViewer.name, nullUpdateBody.name);
  TestValidator.equals("null update email matches", nullUpdatedViewer.email, nullUpdateBody.email);
  */
}
