import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";

export async function test_api_page_comment_creation_as_viewer(
  connection: api.IConnection,
) {
  // 1. Viewer user registration
  const viewerName = RandomGenerator.name();
  const viewerEmail = `${RandomGenerator.name(1).replace(/ /g, "").toLowerCase()}@example.com`;
  const viewerPassword = "SecretPassword123!";

  const joinResponse: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, {
      body: {
        name: viewerName,
        email: viewerEmail,
        password: viewerPassword,
      } satisfies IFlexOfficeViewer.ICreate,
    });
  typia.assert(joinResponse);

  // 2. Viewer user login
  const loginResponse: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.login(connection, {
      body: {
        email: viewerEmail,
        password: viewerPassword,
      } satisfies IFlexOfficeViewer.ILogin,
    });
  typia.assert(loginResponse);
  TestValidator.equals(
    "join and login viewer id should match",
    loginResponse.id,
    joinResponse.id,
  );

  // 3. Prepare a pageId (random UUID)
  const pageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Create a page comment
  const commentContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  });
  const createdComment: IFlexOfficePageComment =
    await api.functional.flexOffice.viewer.pages.pageComments.create(
      connection,
      {
        pageId: pageId,
        body: {
          page_id: pageId,
          editor_id: joinResponse.id,
          content: commentContent,
        } satisfies IFlexOfficePageComment.ICreate,
      },
    );
  typia.assert(createdComment);

  // 5. Validate created comment properties
  TestValidator.equals(
    "comment page_id should match",
    createdComment.page_id,
    pageId,
  );
  TestValidator.equals(
    "comment editor_id should match",
    createdComment.editor_id,
    joinResponse.id,
  );
  TestValidator.predicate(
    "comment content should be non-empty",
    createdComment.content.length > 0,
  );
  TestValidator.predicate(
    "comment id should be UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdComment.id,
    ),
  );
  TestValidator.predicate(
    "comment created_at should be ISO date-time format",
    !isNaN(Date.parse(createdComment.created_at)),
  );
  TestValidator.predicate(
    "comment updated_at should be ISO date-time format",
    !isNaN(Date.parse(createdComment.updated_at)),
  );
  TestValidator.equals(
    "comment deleted_at should be null or undefined",
    createdComment.deleted_at ?? null,
    null,
  );
}
