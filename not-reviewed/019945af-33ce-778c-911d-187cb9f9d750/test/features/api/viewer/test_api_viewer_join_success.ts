import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";

/**
 * Test the successful join operation of a FlexOffice viewer user.
 *
 * This test verifies the process of registering two separate viewer users
 * via the /auth/viewer/join endpoint, ensuring unique emails and secure
 * password handling. It asserts that the responses contain valid viewer IDs
 * formatted as UUIDs and valid JWT authorization tokens with access and
 * refresh tokens along with expiry timestamps. The test asserts full typia
 * validation of the response and checks for correct token issuance and
 * distinct viewer IDs.
 */
export async function test_api_viewer_join_success(
  connection: api.IConnection,
) {
  // First viewer join
  const firstName1 = RandomGenerator.name();
  const email1 = `${firstName1.toLowerCase().replace(/\s+/g, "")}@example.com`;
  const password1 = RandomGenerator.alphaNumeric(12);

  const viewer1: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, {
      body: {
        name: firstName1,
        email: email1,
        password: password1,
      } satisfies IFlexOfficeViewer.ICreate,
    });
  typia.assert(viewer1);

  // Second viewer join
  const firstName2 = RandomGenerator.name();
  const email2 = `${firstName2.toLowerCase().replace(/\s+/g, "")}@example.com`;
  const password2 = RandomGenerator.alphaNumeric(12);

  const viewer2: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, {
      body: {
        name: firstName2,
        email: email2,
        password: password2,
      } satisfies IFlexOfficeViewer.ICreate,
    });
  typia.assert(viewer2);

  // Validate that the two viewer IDs are distinct
  TestValidator.notEquals("viewer IDs should differ", viewer1.id, viewer2.id);

  // Validate that viewer1.id is a UUID format string
  TestValidator.predicate(
    "viewer1 id is uuid formatted",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      viewer1.id,
    ),
  );

  // Validate that viewer2.id is a UUID format string
  TestValidator.predicate(
    "viewer2 id is uuid formatted",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      viewer2.id,
    ),
  );
}
