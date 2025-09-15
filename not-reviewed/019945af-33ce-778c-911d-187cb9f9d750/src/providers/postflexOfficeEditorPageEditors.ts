import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Create a new active editor session on a FlexOffice UI page.
 *
 * This operation enables an editor user to become an active concurrent editor
 * of a UI page, linking the editor and the page with concurrency enforcement.
 *
 * Validation includes ensuring the editor identity matches the authenticated
 * user, the referenced page and editor exist and are active, and no duplicate
 * active session exists.
 *
 * @param props - Props containing the authenticated editor and session creation
 *   payload.
 * @param props.editor - Authenticated editor payload confirming identity.
 * @param props.body - Session creation data with page and editor IDs.
 * @returns The newly created page editor session with timestamps.
 * @throws {Error} When editor ID in token mismatches body editor_id.
 * @throws {Error} When referenced page_id does not exist.
 * @throws {Error} When referenced editor_id does not exist or is inactive.
 * @throws {Error} When a duplicate active editor session exists.
 */
export async function postflexOfficeEditorPageEditors(props: {
  editor: EditorPayload;
  body: IFlexOfficePageEditor.ICreate;
}): Promise<IFlexOfficePageEditor> {
  const { editor, body } = props;

  // Authorization check: editor in token must match editor_id in body
  if (editor.id !== body.editor_id) {
    throw new Error("Unauthorized: Editor ID mismatch");
  }

  // Verify page existence
  const page = await MyGlobal.prisma.flex_office_pages.findUnique({
    where: { id: body.page_id },
  });
  if (!page) {
    throw new Error("Page not found");
  }

  // Verify editor existence and active state
  const editorRecord = await MyGlobal.prisma.flex_office_editors.findUnique({
    where: { id: body.editor_id },
  });
  if (!editorRecord || editorRecord.deleted_at !== null) {
    throw new Error("Editor not found or inactive");
  }

  // Check for existing active session
  const existingSession =
    await MyGlobal.prisma.flex_office_page_editors.findFirst({
      where: {
        page_id: body.page_id,
        editor_id: body.editor_id,
        deleted_at: null,
      },
    });
  if (existingSession) {
    throw new Error("Editor session already exists for this page");
  }

  // Prepare current timestamp
  const now = toISOStringSafe(new Date());

  // Create new editor session
  const created = await MyGlobal.prisma.flex_office_page_editors.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      page_id: body.page_id,
      editor_id: body.editor_id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return created entity with correct types
  return {
    id: created.id,
    page_id: created.page_id,
    editor_id: created.editor_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
